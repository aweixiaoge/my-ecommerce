import type { Prisma } from "@my-ecommerce/db";
import type { AdminProductCreate, VariantDraft } from "@my-ecommerce/shared";
import { ATTRIBUTE_LABELS } from "./product-form";

/**
 * The create form's payload, as rows.
 *
 * Everything the database needs that the form does not say is decided here: the
 * locale, the positions, the `draft` status, and what an empty field becomes.
 * It is a pure function on purpose — the database is not in the unit test lane
 * (`.claude/tdd-guardian/config.json`: "No external services"), so the part
 * that can be wrong in an interesting way is kept where a test can reach it,
 * and the repository that calls it stays a thin shell.
 *
 * The two halves exist because of ids. A variant is selected by an option
 * value, and option values are rows the same statement creates — so the variant
 * cannot be nested inside the product's insert without knowing an id that does
 * not exist yet. The product goes in first, and the variants follow inside the
 * same transaction.
 */

/**
 * The language the first content is written in.
 *
 * plan.md makes multi-language a schema decision and deliberately leaves the
 * feature late (Phase 8), and never names a first locale. The form has no
 * locale picker, so this is the one place that decides — here, rather than
 * inside the shared payload, for the same reason `APP_CURRENCY` lives on the
 * app side: a default baked into the contract is a default every consumer
 * inherits, and a market's choice belongs to the market.
 */
export const DEFAULT_LOCALE = "en";

/**
 * The product, its copy, and the options it is offered in.
 *
 * `status` is `draft` and not a field: nothing here has been checked, priced
 * against a market, or published, and plan.md's statuses exist so that going
 * live is a deliberate act (decision 7 — deletion is archival, and the way back
 * is a status).
 */
export function productCreateData(
  input: AdminProductCreate,
  slug: string,
): Prisma.ProductCreateInput {
  return {
    status: "draft",
    translations: {
      create: {
        locale: DEFAULT_LOCALE,
        name: input.name,
        slug,
        shortDescription: input.shortDescription,
        description: input.description,
      },
    },
    options: {
      create: input.attributes.map((attribute, index) => ({
        // What the option *is*, stored as itself: "Color" below is English for
        // this, and a second language changes the translation rather than the
        // column (plan.md, decision 1).
        kind: attribute.kind,
        // The order the person typed them, which is the order they are offered
        // in on the product page.
        position: index,
        translations: {
          create: {
            locale: DEFAULT_LOCALE,
            // "Colour" and "Size" are translations of the kind, not the kind
            // itself (plan.md, decision 1) — and a translation row is exactly
            // where a language's word for something belongs. The payload keeps
            // sending `color`, and this is the row that says what that is
            // called in English.
            name: ATTRIBUTE_LABELS[attribute.kind],
          },
        },
        values: {
          create: attribute.values.map((value, valueIndex) => ({
            position: valueIndex,
            translations: {
              create: { locale: DEFAULT_LOCALE, name: value },
            },
          })),
        },
      })),
    },
  };
}

/**
 * The variant drafts, by the colour each one prices.
 *
 * Keyed the way the form keys them — trimmed and lowercased — so a draft for
 * "black" is found by the option value "Black", which is how the two halves of
 * the payload were allowed to differ in spelling in the first place.
 */
export function variantDraftsByName(
  variants: readonly VariantDraft[],
): Map<string, VariantDraft> {
  return new Map(
    variants.map((variant) => [variant.color.trim().toLowerCase(), variant]),
  );
}

/**
 * One variant, ready to hang off the option value that selects it.
 *
 * Everything optional on the form becomes `null` rather than a made-up value:
 * a colour nobody has costed has no price, and writing `0.00` there would put a
 * figure in the catalogue that says the product is free. `stock` is the one
 * exception — it defaults to zero, which is the safe direction, and matches the
 * column's own default.
 */
export function variantCreateData(
  draft: VariantDraft,
  optionValueId: string,
): Prisma.ProductVariantCreateWithoutProductInput {
  return {
    ...variantFields(draft),
    status: "draft",
    optionValues: { create: { optionValueId } },
  };
}

/**
 * What a variant row *is*, without the option value that selects it.
 *
 * Split out because editing writes the same fields onto a row that already
 * exists and already knows what selects it. An empty field clears the column
 * rather than leaving it — someone who empties a price means the price is gone,
 * and a save that quietly kept the old one would be a save that did nothing.
 *
 * Plain values rather than one of Prisma's input types: the same object has to
 * be assignable to a create and to an update, and those are different types.
 * `status` is left out for that reason too — a create has to say what status a
 * new row starts in, and an update has no business changing it.
 */
export interface VariantFields {
  sku: string | null;
  priceAmount: string | null;
  priceCurrency: string | null;
  stock: number;
}

export function variantFields(draft: VariantDraft): VariantFields {
  return {
    sku: draft.sku ?? null,
    priceAmount: draft.price?.amount ?? null,
    priceCurrency: draft.price?.currency ?? null,
    stock: draft.stock ?? 0,
  };
}
