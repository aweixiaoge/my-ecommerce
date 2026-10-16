import { compareMoney, type Money } from "@my-ecommerce/shared";

/**
 * What a product costs, as both storefront reads need it.
 *
 * The shop's listing and the product page ask the same question of the same
 * rows — what is the cheapest and the dearest thing this product can be bought
 * for — and the answer has two rules in it that are easy to get subtly wrong.
 * Written once, in a module with no database in it, both readers get the same
 * answer and a test can reach each branch with a plain array.
 */

/**
 * All the prices a row carries.
 *
 * `price_amount` and `price_currency` are independently nullable, because a
 * draft is saved before anyone decides what it costs. Both are required for a
 * price: an amount with no currency is not a smaller number, it is not a price,
 * and passing half of one on would make `Intl.NumberFormat` throw inside a
 * render.
 *
 * `{ toString(): string }` rather than `Decimal`: Prisma's decimal and a test's
 * string literal both satisfy it, so a test does not need the database's type
 * to describe a row.
 */
export function priceOf(variant: {
  priceAmount: { toString(): string } | null;
  priceCurrency: string | null;
}): Money[] {
  return variant.priceAmount !== null && variant.priceCurrency !== null
    ? [{ amount: variant.priceAmount.toString(), currency: variant.priceCurrency }]
    : [];
}

/**
 * The cheapest and dearest of a product's prices, or null when there is no span
 * to draw.
 *
 * Null covers two states, and both of them are "there is no honest figure here"
 * rather than "this failed":
 *
 *   * **nothing is priced.** `ProductSummary.price` is required and not
 *     nullable, and "$0.00" is not the truth — it reads as free. The shop
 *     already leaves such a product out of the listing; the product page has no
 *     card to draw either.
 *   * **the prices are in different currencies.** `compareMoney` refuses to
 *     order them ("amounts in different currencies have no order"), and one
 *     contradictory row must not take a page down with it. Nothing writes a
 *     catalogue like this — the admin form stamps every variant with one
 *     currency — so this guards against a hand-inserted row.
 *
 * `priceMax` is null when every variant costs the same: a range that begins and
 * ends at one figure is not a range, and the design shows a single price for a
 * product that has one.
 */
export function variantPriceSpan(
  prices: readonly Money[],
): { price: Money; priceMax: Money | null } | null {
  const [cheapestPrice, ...otherPrices] = prices;
  if (!cheapestPrice) return null;

  if (otherPrices.some((price) => price.currency !== cheapestPrice.currency)) {
    return null;
  }

  const cheapest = otherPrices.reduce(
    (lowest, price) => (compareMoney(price, lowest) < 0 ? price : lowest),
    cheapestPrice,
  );
  const dearest = otherPrices.reduce(
    (highest, price) => (compareMoney(price, highest) > 0 ? price : highest),
    cheapestPrice,
  );

  return {
    price: cheapest,
    // `compareMoney` and not `===`: "79" against "79.00" is one price written
    // twice, and comparing the strings would render "$79.00 – $79.00".
    priceMax: compareMoney(cheapest, dearest) === 0 ? null : dearest,
  };
}
