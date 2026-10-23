import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@my-ecommerce/shared";
import { redeemCoupon } from "./coupon-repo";

/**
 * Redeeming a code, against a stand-in for the database. The rule itself is
 * `couponDiscount`'s (tested in `@my-ecommerce/shared`); what is left here is
 * the lookup and the mapping into it.
 */
const db = vi.hoisted(() => ({ coupon: { findUnique: vi.fn() } }));

vi.mock("@my-ecommerce/db", () => ({ prisma: db }));

const decimal = (value: string) => ({ toString: () => value });
const NOW = new Date("2026-10-22T12:00:00.000Z");

const line = (productId: string, amount: string) =>
  ({ product: { id: productId }, lineTotal: { amount, currency: "USD" } }) as CartItem;

function couponRow(overrides: Record<string, unknown> = {}) {
  return {
    code: "TAKE5",
    type: "fixed_amount",
    amount: decimal("5.00"),
    currency: "USD",
    appliesToAllProducts: false,
    expiresAt: new Date("2026-12-31T00:00:00.000Z"),
    products: [{ productId: "prod_a" }],
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("redeemCoupon", () => {
  it("looks the code up and applies its rule to the lines", async () => {
    db.coupon.findUnique.mockResolvedValue(couponRow());

    const result = await redeemCoupon("TAKE5", [line("prod_a", "3.00"), line("prod_b", "9.00")], NOW);

    expect(db.coupon.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: "TAKE5" } }),
    );
    // Only prod_a is named, and $5 off a $3 line is $3.
    expect(result).toEqual({
      status: "applied",
      code: "TAKE5",
      discount: { amount: "3.00", currency: "USD" },
    });
  });

  it("says unknown for a code no coupon has", async () => {
    db.coupon.findUnique.mockResolvedValue(null);

    expect(await redeemCoupon("NOPE", [line("prod_a", "3.00")], NOW)).toEqual({ status: "unknown" });
  });

  it("reads with the client it is given — a transaction's", async () => {
    const tx = { coupon: { findUnique: vi.fn().mockResolvedValue(couponRow({ expiresAt: NOW })) } };

    const result = await redeemCoupon("TAKE5", [line("prod_a", "3.00")], NOW, tx as never);

    expect(result).toEqual({ status: "expired" });
    expect(db.coupon.findUnique).not.toHaveBeenCalled();
  });
});
