import { z } from "zod";

/**
 * The admin's product-create payload — the write side of the catalog.
 *
 * `catalog.ts` describes RESOLVED content the API hands the storefront. This
 * describes what the admin form sends back, and it is deliberately smaller.
 * It carries no images and no variant rows: what this creates is a draft with
 * a name, copy, the options the product is offered in, and a **variant draft**
 * per colour — the price, stock, SKU and image ids that will become a
 * `product_variants` row. plan.md gives price and stock to the variant, not the
 * product, so a price typed next to a colour lands on the colour's variant
 * draft rather than on the product, and the shape survives the day variants
 * are written for real.
 */

/**
 * The two attributes the create form offers.
 *
 * A kind, not a name. "Color" and "Size" are *translations* of it (plan.md,
 * decision 1), so storing a language's word here would put English into the
 * contract and into every product row. Widening the list later means adding an
 * enum member, not migrating data.
 */
export const AttributeKindSchema = z.enum(["color", "size"]);

export type AttributeKind = z.infer<typeof AttributeKindSchema>;

/**
 * Bounds, not policy.
 *
 * Every limit here is sized to be far above any real product and well under
 * anything that would make a request expensive to handle — the same reasoning
 * as `AdminLoginSchema`'s maximums.
 */
const NAME_MAX = 200;
const SHORT_DESCRIPTION_MAX = 300;
/** Markdown for a full product page; a generous ceiling, not a target. */
const DESCRIPTION_MAX = 20_000;
const ATTRIBUTE_VALUE_MAX = 40;
const VALUES_PER_ATTRIBUTE_MAX = 30;
const ATTRIBUTES_MAX = 10;
const SKU_MAX = 64;
const MEDIA_ID_MAX = 64;

/**
 * Per-image limits, exported because the two layers that enforce them must
 * agree on them.
 *
 * The browser checks before uploading, so a person is told immediately rather
 * than after a request; the upload action checks again, because a Server Action
 * is reachable by direct POST and the browser's check is feedback, not
 * enforcement. Two copies of the number would drift; one definition cannot.
 *
 * Nothing checks a third time. The mock media store takes what the action gives
 * it, deliberately — a second set of rules in a second place is how the two
 * come apart, and the action is the only door into that store.
 */
export const IMAGES_PER_VARIANT_MAX = 6;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/**
 * The ceiling on variant rows.
 *
 * In practice unreachable, and knowingly so: every variant's colour has to be
 * one of the colour attribute's values, and `VALUES_PER_ATTRIBUTE_MAX` caps
 * those at the same number. It stays as the explicit bound on this array — an
 * array in a request body should say how long it may be — rather than as a rule
 * anything currently relies on.
 */
export const VARIANTS_MAX = 30;

/**
 * The image types accepted, and the reason SVG is not among them.
 *
 * An SVG is a document: it can carry `<script>`, and served from this origin it
 * would run as this origin. A raster image cannot. The list is what the
 * *browser* reports, which a crafted request can lie about — so this narrows
 * the surface rather than closing it, and the media route sends `nosniff`
 * because of exactly that.
 */
export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

const AttributeValueSchema = z.string().trim().min(1).max(ATTRIBUTE_VALUE_MAX);

export const ProductAttributeSchema = z
  .object({
    kind: AttributeKindSchema,
    /**
     * At least one: an attribute with no values ("Color:") is a half-made
     * option row that can never select a variant.
     */
    values: z.array(AttributeValueSchema).min(1).max(VALUES_PER_ATTRIBUTE_MAX),
  })
  .refine(
    // Case-insensitive: "Black" and "black" are one colour, and the storefront
    // would render them as two identical swatches pointing at different rows.
    (attribute) =>
      new Set(attribute.values.map((value) => value.toLowerCase())).size ===
      attribute.values.length,
    {
      message: "Values must be unique.",
      path: ["values"],
    },
  );

export type ProductAttribute = z.infer<typeof ProductAttributeSchema>;

const SkuSchema = z.string().trim().min(1).max(SKU_MAX);

/**
 * A price, which is deliberately NOT `MoneySchema`.
 *
 * `money.ts` is the shape money crosses the wire in, and it admits a negative
 * amount because a refund is a real thing for it to carry. Nothing in a
 * catalogue costs less than nothing, so the amount here is digits with an
 * optional fraction and no sign — the leading `-` is simply not in the pattern.
 * A price of "0" is allowed: a giveaway is unusual, not invalid, and refusing
 * it here would be this file inventing policy.
 *
 * The currency is a 3-letter code the form fills from one constant rather than
 * offering a picker — plan.md keeps a market's defaults out of the database,
 * and the same reasoning applies to a hard-coded one in the UI.
 */
const PriceSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'amount must be a decimal string, e.g. "79.00"'),
  /**
   * Three letters, which is narrower than "three characters" on purpose.
   *
   * `Intl.NumberFormat` — the only thing that renders an amount — throws on a
   * code that is not three ASCII letters, and it throws at render time: one
   * stored price of "US1" takes the whole admin list down on every request,
   * with nothing on the page to say which row did it. A rule the renderer
   * has is a rule the contract has to keep.
   */
  currency: z.string().regex(/^[A-Z]{3}$/, "currency must be a 3-letter code"),
});

/**
 * What one colour's row on the form promises, before it is a variant.
 *
 * Everything but the colour itself is optional, and that is the same decision
 * the rest of this schema makes: the create form produces a DRAFT. A colour
 * nobody has priced yet is a colour added a minute ago, not an error — making
 * the four fields mandatory would mean a product could not be saved until every
 * colour had been costed, which is the state the form's own copy calls fine.
 */
export const VariantDraftSchema = z.object({
  /** The colour option value this prices, spelled as the attribute spells it. */
  color: AttributeValueSchema,
  sku: SkuSchema.optional(),
  price: PriceSchema.optional(),
  stock: z.number().int().nonnegative().optional(),
  /**
   * Ids, not URLs and not bytes.
   *
   * The upload returns an id, and the id is all the client may claim — a
   * payload that carried a URL could point the catalogue at anything, and one
   * that carried bytes would make every read of the product store drag them
   * along.
   */
  mediaIds: z
    .array(z.string().min(1).max(MEDIA_ID_MAX))
    .max(IMAGES_PER_VARIANT_MAX)
    .default([]),
});

export type VariantDraft = z.infer<typeof VariantDraftSchema>;

export const AdminProductCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(NAME_MAX),
    /** May be empty — a draft does not need its blurb written yet. */
    shortDescription: z.string().trim().max(SHORT_DESCRIPTION_MAX),
    /** Markdown source. The form renders a preview; the API stores the text. */
    description: z.string().max(DESCRIPTION_MAX),
    attributes: z.array(ProductAttributeSchema).max(ATTRIBUTES_MAX),
    variants: z.array(VariantDraftSchema).max(VARIANTS_MAX).default([]),
  })
  .refine(
    // Two "Color" attributes on one product is not a product with two colour
    // sets — it is the same option added twice, and the variant matrix would
    // have no way to say which one a variant belongs to.
    (product) =>
      new Set(product.attributes.map((attribute) => attribute.kind)).size ===
      product.attributes.length,
    {
      // Reported on `attributes` because that is the field the form can point
      // at; there is no per-kind path to name.
      message: "Each attribute can only be added once.",
      path: ["attributes"],
    },
  )
  .superRefine((product, context) => {
    // A variant draft is anchored to a colour the product actually offers.
    // Without this the two halves of the form could disagree — the colours list
    // says Black and Sand, the variants say Black and Clay — and the product
    // would be stored with a variant nothing can select.
    const colors = new Set(
      product.attributes
        .filter((attribute) => attribute.kind === "color")
        .flatMap((attribute) => attribute.values)
        .map((value) => value.toLowerCase()),
    );

    const seenColors = new Set<string>();
    const seenSkus = new Set<string>();

    product.variants.forEach((variant, index) => {
      const color = variant.color.toLowerCase();

      if (!colors.has(color)) {
        context.addIssue({
          code: "custom",
          // The colour as typed, not as lowercased: the message is read by
          // someone looking at the box they typed it into.
          message: `${variant.color} is not one of this product's colours.`,
          path: ["variants", index, "color"],
        });
      }

      if (seenColors.has(color)) {
        context.addIssue({
          code: "custom",
          message: `${variant.color} has more than one price and stock row.`,
          path: ["variants", index, "color"],
        });
      }
      seenColors.add(color);

      if (variant.sku === undefined) return;

      const sku = variant.sku.toLowerCase();
      if (seenSkus.has(sku)) {
        // Within this payload only. A SKU is unique across the whole catalogue
        // (plan.md, `product_variants`), and no form can know what else is in
        // it — enforcing that here would be pretending to a guarantee this
        // layer cannot make. The API is where it is checked.
        context.addIssue({
          code: "custom",
          message: `SKU "${variant.sku}" is used by more than one colour.`,
          path: ["variants", index, "sku"],
        });
      }
      seenSkus.add(sku);
    });
  });

export type AdminProductCreate = z.infer<typeof AdminProductCreateSchema>;

/**
 * Publishing and unpublishing, from the product list.
 *
 * Only the two statuses the list's buttons mean. `archived` is the third one
 * plan.md defines and it is deliberately not accepted here: archiving is a
 * deletion flow — nothing referenced by an order is ever hard-deleted, so a
 * product is retired by status — and a flow with no screen behind it would let
 * a crafted POST hide a product in a way nothing in the admin could undo.
 *
 * The name is a string rather than a number, per plan.md's first decision: a
 * product's id is its primary key and nothing human-facing. A payload that
 * carried an index into the current page would point at a different product
 * the moment anything was created, and a list that reorders itself under a
 * click is a list that archives the wrong thing.
 */
export const AdminProductPublishSchema = z.object({
  id: z.string().min(1).max(64),
  status: z.enum(["draft", "active"]),
});

export type AdminProductPublish = z.infer<typeof AdminProductPublishSchema>;
