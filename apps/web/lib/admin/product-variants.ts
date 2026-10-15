import type { Money, VariantDraft } from "@my-ecommerce/shared";
import { compareMoney } from "@my-ecommerce/shared";

/**
 * What the create form collects next to a colour, and the conversions between
 * that and the payload.
 *
 * The form holds what is in the input boxes — price and stock are strings,
 * because that is what a text box contains — and the payload holds what
 * `VariantDraftSchema` accepts. Both of those are decisions rather than
 * formatting, which is why they live here rather than in the component.
 *
 * The colour list is a comma-separated box, so a draft has to survive every
 * keystroke of it. Drafts are keyed by the colour as typed, canonicalised
 * (`colorKey`): typing ", Clay" leaves Black's photographs alone, deleting
 * "Black" stops its row rendering without destroying it, and retyping it brings
 * the row back. Nothing is pruned, because pruning is what would make a typo
 * expensive.
 */

/**
 * The currency the form prices in.
 *
 * One constant, not a picker and not a default inside the shared schema: an
 * amount is meaningless without its currency, but which currency a shop prices
 * in is a market's decision, and plan.md keeps those out of the database
 * (decision 1). When a second market arrives this becomes a field on the form.
 */
export const APP_CURRENCY = "USD";

export interface FormColorDraft {
  sku: string;
  /** As typed. Parsed on the way out, so a half-typed "7" is not an error yet. */
  price: string;
  stock: string;
  /** Ids from the media store, in the order the images should be shown. */
  mediaIds: string[];
  /**
   * Whether a variant already exists for this colour.
   *
   * It only ever matters on the edit screen, and there it matters a lot: a row
   * somebody has emptied still has a variant behind it, and skipping it when
   * the form is sent would leave the old price standing instead of clearing it.
   * A colour nobody has ever filled in has nothing behind it and is skipped,
   * which is what the create form does and what keeps a typed colour from
   * becoming an empty variant.
   */
  saved?: boolean;
}

export function emptyDraft(): FormColorDraft {
  return { sku: "", price: "", stock: "", mediaIds: [] };
}

/**
 * The key a draft is stored under.
 *
 * Trimmed and lowercased, matching how `parseAttributeValues` decides two
 * values are the same one — "Black" typed later as "black " is the same colour
 * and must find the images already uploaded for it.
 */
export function colorKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * The amount as the schema wants it: `undefined` for an empty box, `null` for
 * something that is not a price.
 *
 * The two are different answers and the caller has to tell them apart — an
 * empty box is a draft, and "abc" is a mistake someone needs to be told about.
 * A price is never parsed into a number here: `money.ts` is explicit that
 * amounts cross as decimal strings, and `Number("19.99")` is the precision loss
 * the string exists to avoid.
 */
export function parseAmount(raw: string): string | undefined | null {
  const amount = raw.trim();
  if (amount === "") return undefined;

  // Also what the schema's own pattern says, minus the sign — a catalogue price
  // is not negative, and $.50 is written "0.50".
  return /^\d+(\.\d+)?$/.test(amount) ? amount : null;
}

/** Units, as a whole number: `undefined` empty, `null` invalid. */
export function parseStock(raw: string): number | undefined | null {
  const stock = raw.trim();
  if (stock === "") return undefined;

  // `Number()` alone would take "1e3" as a thousand and "  " as zero, which is
  // how a typo becomes a stock figure nobody typed.
  return /^\d+$/.test(stock) ? Number(stock) : null;
}

/** What is wrong with what was typed, per field, so the form can show it. */
export function draftProblems(draft: FormColorDraft): {
  price?: string;
  stock?: string;
} {
  const problems: { price?: string; stock?: string } = {};

  if (parseAmount(draft.price) === null) {
    problems.price = "Enter a price such as 79.00.";
  }
  if (parseStock(draft.stock) === null) {
    problems.stock = "Enter a whole number of units.";
  }

  return problems;
}

/** Whether any declared colour has something wrong with it. */
export function hasProblems(
  drafts: Record<string, FormColorDraft>,
  colors: readonly string[],
): boolean {
  return colors.some(
    (color) => Object.keys(draftProblems(draftFor(drafts, color))).length > 0,
  );
}

/**
 * The draft for a colour, or a blank one — never undefined.
 *
 * `Object.hasOwn` rather than a plain lookup, because the key is whatever
 * someone typed into the colour box. A colour called `constructor` — or one
 * named `__proto__` — would otherwise find an inherited value on the object
 * prototype and hand back something that is not a draft, turning a name into a
 * crash that takes every value in the form with it.
 */
export function draftFor(
  drafts: Record<string, FormColorDraft>,
  color: string,
): FormColorDraft {
  const key = colorKey(color);
  return Object.hasOwn(drafts, key) ? drafts[key]! : emptyDraft();
}

/** The list with an image appended. */
export function addMediaId(
  ids: readonly string[],
  id: string,
): string[] {
  return [...ids, id];
}

/** The list without one image, wherever it is in the order. */
export function removeMediaId(ids: readonly string[], id: string): string[] {
  return ids.filter((existing) => existing !== id);
}

/**
 * The list with one image moved a place, and unchanged when it is already at
 * the end it is being moved towards — so the buttons that call this need no
 * bounds check of their own.
 */
export function moveMediaId(
  ids: readonly string[],
  id: string,
  delta: number,
): string[] {
  const from = ids.indexOf(id);
  if (from === -1) return [...ids];

  const to = from + delta;
  if (to < 0 || to >= ids.length) return [...ids];

  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);

  return next;
}

/**
 * The variants payload, as JSON for a hidden input.
 *
 * Only the colours currently declared are considered — a draft whose colour was
 * deleted from the box is not submitted, whatever is still in its row — and
 * only the rows with something in them: a colour nobody has priced yet is a
 * colour, not a variant with a blank everything. A stock figure of zero is
 * something, and survives.
 *
 * `colors` must already be de-duplicated, which is what `parseAttributeValues`
 * returns: two rows for one colour is a payload the schema refuses.
 */
export function serializeVariants(
  drafts: Record<string, FormColorDraft>,
  colors: readonly string[],
): string {
  return JSON.stringify(
    colors
      .map((color) => ({
        variant: toVariant(draftFor(drafts, color), color),
        draft: draftFor(drafts, color),
      }))
      .filter(({ variant, draft }) => isFilledIn(variant, draft))
      .map(({ variant }) => variant),
  );
}

function toVariant(draft: FormColorDraft, color: string): VariantDraft {
  const sku = draft.sku.trim();
  const amount = parseAmount(draft.price);
  const stock = parseStock(draft.stock);

  return {
    // The spelling the colour box uses, not the canonical key: the row the
    // person typed is the row the product is stored with.
    color: color.trim(),
    ...(sku === "" ? {} : { sku }),
    ...(typeof amount === "string"
      ? { price: { amount, currency: APP_CURRENCY } }
      : {}),
    ...(typeof stock === "number" ? { stock } : {}),
    mediaIds: [...draft.mediaIds],
  };
}

/**
 * Whether a variant row says anything, or is one the database already has.
 *
 * The colour alone does not count: it is already in the attribute list, and
 * repeating it here would make a draft out of every colour anyone typed. A row
 * loaded from a product does count, even emptied — see `saved`.
 */
function isFilledIn(variant: VariantDraft, draft: FormColorDraft): boolean {
  return (
    draft.saved === true ||
    variant.sku !== undefined ||
    variant.price !== undefined ||
    variant.stock !== undefined ||
    variant.mediaIds.length > 0
  );
}

/**
 * The span a set of prices covers, or null when there are none.
 *
 * The rule `ProductSummary` follows for a live product: one figure when every
 * variant costs the same, a range when they differ, and nothing at all when
 * nothing is priced — which is not the same as "$0.00", a figure that reads as
 * free. It takes prices rather than variants because the admin list has those
 * and the form has the other, and the arithmetic is the same either way.
 *
 * Amounts in different currencies have no order to compare (money.ts throws
 * rather than guessing), and nothing in this app can produce them — every price
 * is written in `APP_CURRENCY`. A direct POST can, so the comparison is
 * restricted to the first currency rather than left able to take the whole
 * admin list down.
 */
export function priceRange(
  prices: readonly Money[],
): { min: Money; max: Money } | null {
  if (prices.length === 0) return null;

  const currency = prices[0]!.currency;
  const comparable = prices.filter((price) => price.currency === currency);
  const sorted = [...comparable].sort(compareMoney);

  return { min: sorted[0]!, max: sorted[sorted.length - 1]! };
}
