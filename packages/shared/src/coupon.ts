import { z } from "zod";
import { addMoney, compareMoney, percentOfMoney, type Money } from "./money";
import { COUPON_CODE_MAX, type CouponType } from "./admin-coupon";

/**
 * Redeeming a coupon: what a code takes off a set of lines.
 *
 * The admin's create screen (`admin-coupon.ts`) writes the coupon; this is the
 * one rule for reading it, shared by the checkout's "Apply" preview and the
 * order that is placed, so the figure a shopper is shown and the figure they
 * are charged come from the same function.
 *
 * - A coupon is good until its `expiresAt`, exclusive.
 * - It discounts the lines it applies to — every line, or those whose product
 *   is in its list — and nothing else: not shipping, not other lines.
 * - A percentage is of those lines' total, to the cent.
 * - A fixed amount comes off those lines' total, never below zero: a $10
 *   coupon on a $6 line is worth $6, and no change is given.
 */

/**
 * The code as a shopper types it: trimmed and upper-cased the way the admin
 * stores it, so "save10 " finds `SAVE10`. Only the length is bounded here — a
 * code of the wrong shape is simply one that matches no coupon.
 */
export const CouponCodeSchema = z.string().trim().toUpperCase().min(1).max(COUPON_CODE_MAX);

/** A coupon as it is redeemed — the columns the rule reads. */
export interface RedeemableCoupon {
  code: string;
  type: CouponType;
  /** A decimal string: money for `fixed_amount`, a percent for `percentage`. */
  amount: string;
  /** The fixed amount's currency; null for a percentage. */
  currency: string | null;
  appliesToAllProducts: boolean;
  /** The products it applies to, when it does not apply to all. */
  productIds: readonly string[];
  expiresAt: Date;
}

/** A line as the rule needs it: whose product, and what it costs. */
export interface DiscountableLine {
  productId: string;
  lineTotal: Money;
}

/**
 * Why a code took nothing off — a code, not a sentence; the words are the
 * storefront's catalog. `unknown` (no coupon has the code) is the caller's to
 * say, since only the database knows it.
 *
 * - `expired`: past its expiry.
 * - `notApplicable`: none of the lines are ones it applies to, or a fixed
 *   amount is in a currency the lines are not.
 */
export type CouponRefusal = "unknown" | "expired" | "notApplicable";

export type CouponDiscount =
  | { status: "applied"; code: string; discount: Money }
  | { status: "expired" | "notApplicable" };

export function couponDiscount(
  coupon: RedeemableCoupon,
  lines: readonly DiscountableLine[],
  now: Date,
): CouponDiscount {
  if (coupon.expiresAt.getTime() <= now.getTime()) return { status: "expired" };

  const eligible = lines.filter(
    (line) => coupon.appliesToAllProducts || coupon.productIds.includes(line.productId),
  );
  if (eligible.length === 0) return { status: "notApplicable" };

  const base = eligible
    .slice(1)
    .reduce((sum, line) => addMoney(sum, line.lineTotal), eligible[0].lineTotal);

  if (coupon.type === "percentage") {
    return { status: "applied", code: coupon.code, discount: percentOfMoney(base, coupon.amount) };
  }

  if (coupon.currency !== null && coupon.currency !== base.currency) {
    return { status: "notApplicable" };
  }

  const face: Money = { amount: coupon.amount, currency: base.currency };
  return {
    status: "applied",
    code: coupon.code,
    discount: compareMoney(face, base) > 0 ? base : face,
  };
}
