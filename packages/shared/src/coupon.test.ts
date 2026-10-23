import { describe, expect, it } from "vitest";
import { CheckoutSchema } from "./checkout";
import { CouponCodeSchema, couponDiscount, type RedeemableCoupon } from "./coupon";
import type { Money } from "./money";

const NOW = new Date("2026-10-22T12:00:00Z");
const usd = (amount: string): Money => ({ amount, currency: "USD" });

function coupon(overrides: Partial<RedeemableCoupon> = {}): RedeemableCoupon {
  return {
    code: "SAVE10",
    type: "percentage",
    amount: "10",
    currency: null,
    appliesToAllProducts: true,
    productIds: [],
    expiresAt: new Date("2026-12-31T00:00:00Z"),
    ...overrides,
  };
}

const LINES = [
  { productId: "prod_a", lineTotal: usd("40.00") },
  { productId: "prod_b", lineTotal: usd("24.45") },
];

describe("couponDiscount", () => {
  it("takes a percentage of every line when the coupon applies to all products", () => {
    expect(couponDiscount(coupon(), LINES, NOW)).toEqual({
      status: "applied",
      code: "SAVE10",
      // 10% of 64.45, half a cent rounded up.
      discount: usd("6.45"),
    });
  });

  it("takes a percentage of only the lines whose product is listed", () => {
    const result = couponDiscount(
      coupon({ appliesToAllProducts: false, productIds: ["prod_b"] }),
      LINES,
      NOW,
    );
    expect(result).toEqual({ status: "applied", code: "SAVE10", discount: usd("2.45") });
  });

  it("takes a fixed amount off as written", () => {
    const result = couponDiscount(
      coupon({ type: "fixed_amount", amount: "5.00", currency: "USD" }),
      LINES,
      NOW,
    );
    expect(result).toEqual({ status: "applied", code: "SAVE10", discount: usd("5.00") });
  });

  it("caps a fixed amount at what the lines it applies to cost", () => {
    const result = couponDiscount(
      coupon({
        type: "fixed_amount",
        amount: "30.00",
        currency: "USD",
        appliesToAllProducts: false,
        productIds: ["prod_b"],
      }),
      LINES,
      NOW,
    );
    expect(result).toEqual({ status: "applied", code: "SAVE10", discount: usd("24.45") });
  });

  it("refuses a coupon at and after its expiry", () => {
    expect(couponDiscount(coupon({ expiresAt: NOW }), LINES, NOW)).toEqual({ status: "expired" });
    expect(
      couponDiscount(coupon({ expiresAt: new Date("2026-01-01T00:00:00Z") }), LINES, NOW),
    ).toEqual({ status: "expired" });
  });

  it("refuses a coupon for none of the cart's products", () => {
    const result = couponDiscount(
      coupon({ appliesToAllProducts: false, productIds: ["prod_z"] }),
      LINES,
      NOW,
    );
    expect(result).toEqual({ status: "notApplicable" });
  });

  it("refuses an empty set of lines", () => {
    expect(couponDiscount(coupon(), [], NOW)).toEqual({ status: "notApplicable" });
  });

  it("refuses a fixed amount in another currency than the lines'", () => {
    const result = couponDiscount(
      coupon({ type: "fixed_amount", amount: "5.00", currency: "EUR" }),
      LINES,
      NOW,
    );
    expect(result).toEqual({ status: "notApplicable" });
  });
});

describe("CouponCodeSchema", () => {
  it("reads a code the way the admin stores it", () => {
    expect(CouponCodeSchema.parse("  save10 ")).toBe("SAVE10");
  });

  it("refuses a blank code", () => {
    expect(CouponCodeSchema.safeParse("   ").success).toBe(false);
  });
});

describe("CheckoutSchema's coupon code", () => {
  const base = {
    idempotencyKey: "4b0c5c3e-6a8f-4f45-9d6e-1f2a3b4c5d6e",
    email: "ada@example.com",
    shipping: {
      countryCode: "CN",
      firstName: "Ada",
      lastName: "Lovelace",
      line1: "1 Century Avenue",
      city: "Shanghai",
      postalCode: "200120",
    },
    billingSameAsShipping: true,
    shippingMethod: "standard",
    paymentMethod: "cod",
  };

  it("is optional", () => {
    const parsed = CheckoutSchema.parse(base);
    expect(parsed.couponCode).toBeUndefined();
  });

  it("is normalised when given", () => {
    expect(CheckoutSchema.parse({ ...base, couponCode: "save10" }).couponCode).toBe("SAVE10");
  });
});
