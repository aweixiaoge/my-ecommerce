import { describe, expect, it } from "vitest";
import {
  adminCouponCreateSchema,
  COUPON_CODE_ALPHABET,
  generateCouponCode,
  GENERATED_COUPON_CODE_LENGTH,
} from "./admin-coupon";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const schema = adminCouponCreateSchema(NOW);

/** A payload that passes, so each case below can vary one thing. */
function coupon(overrides: Record<string, unknown> = {}) {
  return {
    code: "SAVE10",
    type: "percentage",
    amount: "10",
    appliesToAllProducts: true,
    productIds: [],
    expiresAt: "2026-12-31T23:59:00.000Z",
    ...overrides,
  };
}

/** The paths of every issue, so a case can say which field it refused. */
function failedPaths(input: Record<string, unknown>): string[] {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

describe("generateCouponCode", () => {
  it("draws the full length from the unambiguous alphabet", () => {
    const code = generateCouponCode();

    expect(code).toHaveLength(GENERATED_COUPON_CODE_LENGTH);
    for (const letter of code) expect(COUPON_CODE_ALPHABET).toContain(letter);
  });

  it("maps every byte value onto the alphabet without falling off its end", () => {
    // 0 and 255 are the edges of a byte; `& 31` must land both in range.
    const fill = (bytes: Uint8Array) => bytes.fill(255);
    expect(generateCouponCode(fill)).toBe("9".repeat(GENERATED_COUPON_CODE_LENGTH));

    const zero = (bytes: Uint8Array) => bytes.fill(0);
    expect(generateCouponCode(zero)).toBe("A".repeat(GENERATED_COUPON_CODE_LENGTH));
  });

  it("has exactly 32 symbols, none of them look-alikes", () => {
    expect(COUPON_CODE_ALPHABET).toHaveLength(32);
    expect(new Set(COUPON_CODE_ALPHABET).size).toBe(32);
    for (const lookAlike of ["0", "O", "1", "I"]) {
      expect(COUPON_CODE_ALPHABET).not.toContain(lookAlike);
    }
  });

  it("produces a code the create schema accepts", () => {
    expect(schema.safeParse(coupon({ code: generateCouponCode() })).success).toBe(true);
  });
});

describe("adminCouponCreateSchema", () => {
  it("accepts a percentage coupon for every product", () => {
    expect(schema.safeParse(coupon()).success).toBe(true);
  });

  it("trims and upper-cases the code, so two spellings are one coupon", () => {
    const result = schema.safeParse(coupon({ code: "  save10 " }));

    expect(result.success && result.data.code).toBe("SAVE10");
  });

  it("rejects a code that is too short, too long, or has other characters", () => {
    for (const code of ["AB", "A".repeat(33), "SAVE 10", "SAVE%10", ""]) {
      expect(failedPaths(coupon({ code }))).toContain("code");
    }
    expect(schema.safeParse(coupon({ code: "ABC" })).success).toBe(true);
    expect(schema.safeParse(coupon({ code: "A".repeat(32) })).success).toBe(true);
  });

  it("accepts both discount types and nothing else", () => {
    expect(schema.safeParse(coupon({ type: "fixed_amount", amount: "5.50" })).success).toBe(
      true,
    );
    expect(failedPaths(coupon({ type: "free_shipping" }))).toContain("type");
  });

  it("refuses an amount that is zero, negative, not a number, or has three places", () => {
    for (const amount of ["0", "0.00", "-5", "abc", "", "1.005"]) {
      expect(failedPaths(coupon({ amount }))).toContain("amount");
    }
  });

  it("caps a percentage at 100, but not a fixed amount", () => {
    expect(failedPaths(coupon({ amount: "100.01" }))).toContain("amount");
    expect(schema.safeParse(coupon({ amount: "100" })).success).toBe(true);
    expect(
      schema.safeParse(coupon({ type: "fixed_amount", amount: "250" })).success,
    ).toBe(true);
  });

  it("needs at least one product when it does not apply to all of them", () => {
    expect(
      failedPaths(coupon({ appliesToAllProducts: false, productIds: [] })),
    ).toContain("productIds");

    const result = schema.safeParse(
      coupon({ appliesToAllProducts: false, productIds: ["p1", "p2", "p1"] }),
    );
    expect(result.success && result.data.productIds).toEqual(["p1", "p2"]);
  });

  it("drops a selection when the coupon applies to every product", () => {
    const result = schema.safeParse(
      coupon({ appliesToAllProducts: true, productIds: ["p1"] }),
    );

    expect(result.success && result.data.productIds).toEqual([]);
  });

  it("refuses an expiry that is not after now", () => {
    expect(failedPaths(coupon({ expiresAt: NOW.toISOString() }))).toContain("expiresAt");
    expect(failedPaths(coupon({ expiresAt: "2026-10-01T00:00:00.000Z" }))).toContain(
      "expiresAt",
    );
    expect(failedPaths(coupon({ expiresAt: "next week" }))).toContain("expiresAt");
  });
});
