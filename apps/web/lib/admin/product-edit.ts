import type { FormAttribute } from "./product-form";
import { colorKey, type FormColorDraft } from "./product-variants";
import type { ProductForEdit } from "./products-repo";

/**
 * A stored product, in the units the create form holds.
 *
 * The edit screen is the create screen, so this is the whole of the difference
 * between them: what the database holds, written the way the form's state is
 * written. Prices come back as the strings a text box contains, the colours
 * come back as the one comma-separated line the values box shows, and the
 * per-colour rows come back keyed the way the form keys them.
 *
 * Doing it here rather than in the component is what lets the form be a form
 * rather than two forms wearing a prop: it is handed state, and it cannot tell
 * which screen it is on.
 */
export function toFormAttributes(
  attributes: ProductForEdit["attributes"],
): FormAttribute[] {
  return attributes.map((attribute) => ({
    kind: attribute.kind,
    values: attribute.values.map((value) => value.name).join(", "),
  }));
}

/**
 * The colour rows, keyed by the colour they belong to.
 *
 * `saved` marks a row that a variant already exists for, and it is what lets
 * the form tell two otherwise identical rows apart: a colour somebody has
 * cleared the price out of still has a variant, so saving has to write the
 * cleared price rather than skip the row and leave the old one standing.
 */
export function toFormDrafts(
  variants: ProductForEdit["variants"],
): Record<string, FormColorDraft> {
  const drafts: Record<string, FormColorDraft> = {};

  for (const variant of variants) {
    if (variant.color === "") continue;

    drafts[colorKey(variant.color)] = {
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
      mediaIds: [...variant.mediaIds],
      saved: true,
    };
  }

  return drafts;
}
