import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CouponNotFoundError,
  createCoupon,
  DuplicateCouponCodeError,
  getCouponForEdit,
  listCouponProductChoices,
  listCoupons,
  UnknownCouponProductError,
  updateCoupon,
} from "./coupons-repo";

/**
 * The coupon reads and writes, against a stand-in for the database — the lane
 * has no external services, so what is asserted is the shape of each query,
 * what a row becomes on the screen, and which errors become sentences.
 */
const db = vi.hoisted(() => {
  const tx = {
    coupon: { update: vi.fn() },
    couponProduct: { deleteMany: vi.fn(), createMany: vi.fn() },
  };
  return {
    tx,
    coupon: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    $transaction: vi.fn(async (run: (client: typeof tx) => unknown) => run(tx)),
  };
});

vi.mock("@my-ecommerce/db", () => ({
  prisma: {
    coupon: db.coupon,
    product: db.product,
    $transaction: db.$transaction,
  },
}));

/** A payload as the schema hands it over. */
function input(overrides: Record<string, unknown> = {}) {
  return {
    code: "SAVE10",
    type: "percentage" as const,
    amount: "10",
    appliesToAllProducts: true,
    productIds: [] as string[],
    expiresAt: "2026-12-31T23:59:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.coupon.create.mockResolvedValue({ id: "cpn_1" });
  db.coupon.findMany.mockResolvedValue([]);
  db.product.findMany.mockResolvedValue([]);
});

describe("createCoupon", () => {
  it("writes a percentage with no currency, for every product", async () => {
    expect(await createCoupon(input())).toBe("cpn_1");

    const [args] = db.coupon.create.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(args.data).toMatchObject({
      code: "SAVE10",
      type: "percentage",
      amount: "10",
      currency: null,
      appliesToAllProducts: true,
      expiresAt: new Date("2026-12-31T23:59:00.000Z"),
      products: { create: [] },
    });
  });

  it("writes a fixed amount in the shop's currency, linked to its products", async () => {
    await createCoupon(
      input({
        type: "fixed_amount",
        amount: "5.50",
        appliesToAllProducts: false,
        productIds: ["p1", "p2"],
      }),
    );

    const [args] = db.coupon.create.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(args.data).toMatchObject({
      currency: "USD",
      appliesToAllProducts: false,
      products: { create: [{ productId: "p1" }, { productId: "p2" }] },
    });
  });

  it("names a taken code", async () => {
    db.coupon.create.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));

    await expect(createCoupon(input())).rejects.toBeInstanceOf(DuplicateCouponCodeError);
  });

  it("names a product that is no longer there", async () => {
    db.coupon.create.mockRejectedValue(Object.assign(new Error("fk"), { code: "P2003" }));

    await expect(
      createCoupon(input({ appliesToAllProducts: false, productIds: ["gone"] })),
    ).rejects.toBeInstanceOf(UnknownCouponProductError);
  });

  it("passes any other failure up untouched", async () => {
    const failure = new Error("connection refused");
    db.coupon.create.mockRejectedValue(failure);

    await expect(createCoupon(input())).rejects.toBe(failure);
  });
});

describe("listCoupons", () => {
  it("takes every coupon, newest first", async () => {
    await listCoupons();

    expect(db.coupon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ createdAt: "desc" }, { id: "asc" }] }),
    );
  });

  it("reads a fixed amount as money and a percentage as a percent", async () => {
    const base = {
      appliesToAllProducts: false,
      expiresAt: new Date("2026-12-31T23:59:00.000Z"),
      createdAt: new Date("2026-10-22T08:00:00.000Z"),
      _count: { products: 2 },
    };
    db.coupon.findMany.mockResolvedValue([
      {
        ...base,
        id: "c1",
        code: "FIVE",
        type: "fixed_amount",
        amount: { toString: () => "5.00" },
        currency: "USD",
      },
      {
        ...base,
        id: "c2",
        code: "TEN",
        type: "percentage",
        amount: { toString: () => "10.00" },
        currency: null,
      },
    ]);

    const [fixed, percentage] = await listCoupons();

    expect(fixed?.value).toEqual({
      kind: "fixed",
      money: { amount: "5.00", currency: "USD" },
    });
    expect(percentage?.value).toEqual({ kind: "percentage", percent: "10.00" });
    expect(fixed?.productCount).toBe(2);
    expect(fixed?.expiresAt).toBe("2026-12-31T23:59:00.000Z");
  });

  it("marks a coupon expired at and after its expiry, as the checkout does", async () => {
    const row = (id: string, expiresAt: string) => ({
      id,
      code: id,
      type: "percentage",
      amount: { toString: () => "10" },
      currency: null,
      appliesToAllProducts: true,
      expiresAt: new Date(expiresAt),
      createdAt: new Date("2026-10-01T00:00:00.000Z"),
      _count: { products: 0 },
    });
    db.coupon.findMany.mockResolvedValue([
      row("past", "2026-10-21T00:00:00.000Z"),
      row("now", "2026-10-22T12:00:00.000Z"),
      row("later", "2026-10-23T00:00:00.000Z"),
    ]);

    const coupons = await listCoupons(new Date("2026-10-22T12:00:00.000Z"));

    expect(coupons.map((coupon) => coupon.expired)).toEqual([true, true, false]);
  });
});

describe("listCouponProductChoices", () => {
  it("offers every product by its name, alphabetically", async () => {
    db.product.findMany.mockResolvedValue([
      { id: "p2", status: "active", translations: [{ name: "Speaker" }] },
      { id: "p1", status: "draft", translations: [{ name: "Earbuds" }] },
      { id: "p3", status: "active", translations: [] },
    ]);

    const choices = await listCouponProductChoices();

    expect(choices.map((choice) => choice.id)).toEqual(["p3", "p1", "p2"]);
    expect(choices[1]).toEqual({ id: "p1", name: "Earbuds", status: "draft" });

    const [args] = db.product.findMany.mock.calls[0] as [{ where?: unknown }];
    // Drafts included: a coupon can be ready before its product goes live.
    expect(args.where).toBeUndefined();
  });
});

describe("getCouponForEdit", () => {
  it("returns the coupon as the form starts from it", async () => {
    db.coupon.findUnique.mockResolvedValue({
      id: "cpn_1",
      code: "TAKE5",
      type: "fixed_amount",
      amount: { toString: () => "5.5", toFixed: (places: number) => (5.5).toFixed(places) },
      appliesToAllProducts: false,
      expiresAt: new Date("2026-12-31T07:59:00.000Z"),
      updatedAt: new Date("2026-10-22T08:00:00.000Z"),
      products: [{ productId: "prod_a" }, { productId: "prod_b" }],
    });

    expect(await getCouponForEdit("cpn_1")).toEqual({
      id: "cpn_1",
      code: "TAKE5",
      type: "fixed_amount",
      amount: "5.50",
      appliesToAllProducts: false,
      productIds: ["prod_a", "prod_b"],
      expiresAt: "2026-12-31T07:59:00.000Z",
      updatedAt: "2026-10-22T08:00:00.000Z",
    });
    expect(db.coupon.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "cpn_1" } }),
    );
  });

  it("keeps a percentage as written, without money's two places", async () => {
    db.coupon.findUnique.mockResolvedValue({
      id: "cpn_2",
      code: "WELCOME10",
      type: "percentage",
      amount: { toString: () => "10", toFixed: () => "10.00" },
      appliesToAllProducts: true,
      expiresAt: new Date("2027-03-31T00:00:00.000Z"),
      updatedAt: new Date("2026-10-22T08:00:00.000Z"),
      products: [],
    });

    expect((await getCouponForEdit("cpn_2"))?.amount).toBe("10");
  });

  it("returns null for an id that is not a coupon", async () => {
    db.coupon.findUnique.mockResolvedValue(null);
    expect(await getCouponForEdit("nope")).toBeNull();
  });
});

describe("updateCoupon", () => {
  it("rewrites the coupon and replaces its products in one transaction", async () => {
    await updateCoupon(
      "cpn_1",
      input({ type: "fixed_amount", amount: "7.50", appliesToAllProducts: false, productIds: ["prod_b"] }),
    );

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.tx.coupon.update).toHaveBeenCalledWith({
      where: { id: "cpn_1" },
      data: {
        code: "SAVE10",
        type: "fixed_amount",
        amount: "7.50",
        currency: "USD",
        appliesToAllProducts: false,
        expiresAt: new Date("2026-12-31T23:59:00.000Z"),
      },
    });
    expect(db.tx.couponProduct.deleteMany).toHaveBeenCalledWith({ where: { couponId: "cpn_1" } });
    expect(db.tx.couponProduct.createMany).toHaveBeenCalledWith({
      data: [{ couponId: "cpn_1", productId: "prod_b" }],
    });
  });

  it("clears the product list, and the currency, for an all-products percentage", async () => {
    await updateCoupon("cpn_1", input());

    expect(db.tx.coupon.update.mock.calls[0]![0].data).toMatchObject({
      type: "percentage",
      currency: null,
      appliesToAllProducts: true,
    });
    expect(db.tx.couponProduct.deleteMany).toHaveBeenCalled();
    expect(db.tx.couponProduct.createMany).not.toHaveBeenCalled();
  });

  it.each([
    ["P2025", CouponNotFoundError],
    ["P2002", DuplicateCouponCodeError],
    ["P2003", UnknownCouponProductError],
  ])("turns %s into the error the form can name", async (code, ErrorType) => {
    db.$transaction.mockRejectedValueOnce(Object.assign(new Error("db"), { code }));

    await expect(updateCoupon("cpn_1", input())).rejects.toBeInstanceOf(ErrorType);
  });

  it("rethrows anything else as it is", async () => {
    const failure = new Error("connection lost");
    db.$transaction.mockRejectedValueOnce(failure);

    await expect(updateCoupon("cpn_1", input())).rejects.toBe(failure);
  });
});
