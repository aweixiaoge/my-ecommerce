import { z } from "zod";

/**
 * The admin's product-create payload — the write side of the catalog.
 *
 * `catalog.ts` describes RESOLVED content the API hands the storefront. This
 * describes what the admin form sends back, and it is deliberately much
 * smaller. It carries no price, no SKU and no images because plan.md gives
 * price and stock to the *variant*, not the product: what this creates is a
 * draft with a name and copy, and it becomes purchasable when its variants
 * exist. A form that asked for a price here would be asking for the wrong
 * thing, and the shape would have to be undone later.
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

export const AdminProductCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(NAME_MAX),
    /** May be empty — a draft does not need its blurb written yet. */
    shortDescription: z.string().trim().max(SHORT_DESCRIPTION_MAX),
    /** Markdown source. The form renders a preview; the API stores the text. */
    description: z.string().max(DESCRIPTION_MAX),
    attributes: z.array(ProductAttributeSchema).max(ATTRIBUTES_MAX),
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
  );

export type AdminProductCreate = z.infer<typeof AdminProductCreateSchema>;
