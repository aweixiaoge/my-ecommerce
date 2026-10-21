import type { Money } from "@my-ecommerce/shared";
import { convertMoney, type DisplayCurrency } from "@/lib/currency/display";

/**
 * Formats a Money value for display.
 *
 * `Intl.NumberFormat` accepts a decimal STRING and formats it without a round
 * trip through a binary float — which is exactly why the API sends money as a
 * string. Do not "simplify" this to `Number(money.amount)`.
 */
export function formatMoney(money: Money, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
  }).format(money.amount as unknown as number);
}

/**
 * Formats a *price* for the reader: converted into the currency they are
 * reading in, then written the way their language writes money.
 *
 * The two steps in that order, and this is the only place the storefront does
 * either — every price on every page, from a home-page card to the buy box on a
 * product page, comes through here. What it does not do is decide anything:
 * which currency is `display` is the request's business (`lib/currency`), and
 * whether a product's two prices are a range at all is `variantPriceSpan`'s,
 * settled in the stored currency before either figure arrives.
 *
 * `formatMoney` is still the right call for money that is not for sale in the
 * reader's currency — the admin's prices, the free-shipping threshold, the
 * cart's placeholder — where converting would be converting the shop's own
 * terms.
 */
export function formatPrice(
  money: Money,
  display: DisplayCurrency,
  locale = "en-US",
): string {
  return formatMoney(convertMoney(money, display), locale);
}

/**
 * Formats an instant for display — "October 12, 2026", which is the `long`
 * date style and the form the design's review rows are written in.
 *
 * `timeZone: "UTC"` rather than the environment's, and it is not the same
 * decision as "the server's timezone is UTC anyway": a review written at 23:00
 * UTC would print tomorrow's date on a machine an hour or more ahead, so the
 * date stamp on somebody's review would depend on where the app happens to be
 * running. Whatever the reader's own timezone is, it is not this function's
 * business — the design sets the date in uppercase type, not in a local
 * calendar, and a date signed to a review is a fact about when it was written.
 */
export function formatDate(iso: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(iso));
}
