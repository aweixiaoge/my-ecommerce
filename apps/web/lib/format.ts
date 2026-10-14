import type { Money } from "@my-ecommerce/shared";

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
