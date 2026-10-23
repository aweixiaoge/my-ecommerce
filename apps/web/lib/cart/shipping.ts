import { compareMoney, type Money } from "@my-ecommerce/shared";
import { SHOP_CURRENCY } from "@/lib/currency/display";

/**
 * The shop's free-shipping promise, in one place.
 *
 * The home page's trust bar names the threshold ("Free shipping over $50.00")
 * and the cart's totals keep it. Two copies of the number would be two
 * promises the first time one of them changed — which is why it moved here
 * from `components/trust-bar.tsx` when the cart started reading it.
 *
 * A value rather than the "$50" the copy used to carry: the currency is the
 * shop's, and what changes per language is how it is written. It belongs to the
 * shop rather than to a catalog — moving the number between languages would be
 * moving a price.
 */
export const FREE_SHIPPING_THRESHOLD: Money = { amount: "50", currency: SHOP_CURRENCY };

/**
 * Whether a subtotal ships free: at or over the threshold.
 *
 * Compared in the shop's currency, before any conversion, for the reason
 * `lib/currency/display.ts` gives — rounding is what makes two prices equal, so
 * a converted figure is never what a rule is decided on. A subtotal in another
 * currency has no honest answer and is not free.
 */
export function shipsFree(subtotal: Money): boolean {
  return (
    subtotal.currency === FREE_SHIPPING_THRESHOLD.currency &&
    compareMoney(subtotal, FREE_SHIPPING_THRESHOLD) >= 0
  );
}

/**
 * What standard delivery costs under the threshold — the one rate the shop
 * charges, whatever the address.
 *
 * A flat rate is a placeholder for a rate table by zone (plan.md's shipping
 * rates arrive with fulfilment), and it is a business number, not a technical
 * one: change it here and the checkout, the order and the confirmation follow.
 */
export const STANDARD_SHIPPING_RATE: Money = { amount: "5.00", currency: SHOP_CURRENCY };

/** What a subtotal's standard delivery costs: nothing over the threshold. */
export function shippingCost(subtotal: Money): Money {
  return shipsFree(subtotal)
    ? { amount: "0.00", currency: SHOP_CURRENCY }
    : STANDARD_SHIPPING_RATE;
}
