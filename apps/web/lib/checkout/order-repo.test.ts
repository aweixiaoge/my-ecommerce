import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Checkout } from "@my-ecommerce/shared";
import { displayCurrency } from "@/lib/currency/display";
import { hashCartToken } from "@/lib/cart/cart-token";
import { getOrder, placeOrder } from "./order-repo";

/**
 * Placing an order, against a stand-in for the database.
 *
 * What matters is what the transaction decides: which lines are ordered, that
 * stock is taken only where there is enough, that the totals are the cart's
 * and not the form's, that a second submission finds the first order, and
 * that the ordered lines leave the cart.
 */
const db = vi.hoisted(() => {
  const tx = {
    cart: { findFirst: vi.fn() },
    coupon: { findUnique: vi.fn() },
    productVariant: { updateMany: vi.fn() },
    order: { create: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
  };

  return {
    tx,
    order: { findUnique: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(async (run: (client: typeof tx) => unknown) => run(tx)),
  };
});

vi.mock("@my-ecommerce/db", () => ({ prisma: db }));

const decimal = (value: string) => ({ toString: () => value });

/** A cart line as `cartSelect` returns it. */
function line(id: string, price: string, quantity: number, stock = 10, status = "active") {
  return {
    id,
    quantity,
    optionValue: null,
    variant: {
      id: `var_${id}`,
      sku: `SKU-${id}`,
      priceAmount: decimal(price),
      priceCurrency: "USD",
      stock,
      optionValues: [],
      media: [],
      product: {
        id: `prod_${id}`,
        status,
        translations: [{ name: `Product ${id}`, slug: `p-${id}`, locale: "en" }],
        media: [],
        categories: [],
      },
    },
  };
}

const address: Checkout["shipping"] = {
  countryCode: "CN",
  firstName: "Ada",
  lastName: "Lovelace",
  line1: "1 Century Avenue",
  line2: undefined,
  city: "Shanghai",
  region: "Shanghai",
  postalCode: "200120",
  phone: undefined,
};

const input: Checkout = {
  idempotencyKey: "4b0c5c3e-6a8f-4f45-9d6e-1f2a3b4c5d6e",
  email: "ada@example.com",
  shipping: address,
  billingSameAsShipping: true,
  shippingMethod: "standard",
  paymentMethod: "cod",
  note: undefined,
};

const context = { locale: "en" as const, display: displayCurrency([]) };
const NOW = new Date("2026-10-21T12:00:00.000Z");

/** The `data` the order was created with. */
const created = () =>
  (db.tx.order.create.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;

beforeEach(() => {
  vi.clearAllMocks();
  db.order.findUnique.mockResolvedValue(null);
  db.tx.cart.findFirst.mockResolvedValue({ id: "cart_1", items: [line("a", "21.23", 1)] });
  db.tx.productVariant.updateMany.mockResolvedValue({ count: 1 });
  db.tx.order.create.mockResolvedValue({ orderNumber: 1001 });
});

describe("placeOrder", () => {
  it("orders the cart the cookie opens, and answers with the order's link", async () => {
    const result = await placeOrder("tok", input, context, NOW);

    expect(result).toMatchObject({ status: "placed", orderNumber: 1001 });
    expect((result as { accessKey: string }).accessKey).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(db.tx.cart.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tokenHash: hashCartToken("tok"), expiresAt: { gt: NOW } },
      }),
    );
  });

  it("records the signed-in customer, and none for a guest", async () => {
    await placeOrder("tok", input, { ...context, customerId: "c_1" });
    expect(created().customerId).toBe("c_1");

    vi.clearAllMocks();
    db.order.findUnique.mockResolvedValue(null);
    db.tx.cart.findFirst.mockResolvedValue({ id: "cart_1", items: [line("a", "21.23", 1)] });
    db.tx.productVariant.updateMany.mockResolvedValue({ count: 1 });
    db.tx.order.create.mockResolvedValue({ orderNumber: 1001 });

    await placeOrder("tok", input, context);
    expect(created().customerId).toBeNull();
  });

  it("prices the order from the cart and the shipping rule, never the form", async () => {
    await placeOrder("tok", input, context);

    // $21.23 is under the $50 threshold: standard delivery is $5.00.
    expect(created()).toMatchObject({
      currency: "USD",
      displayCurrency: "USD",
      exchangeRate: "1",
      subtotal: "21.23",
      shippingTotal: "5.00",
      discountTotal: "0.00",
      taxTotal: "0.00",
      grandTotal: "26.23",
    });
    // `pending` is the column's default rather than something this writes.
    expect(created()).not.toHaveProperty("status");
  });

  it("records a rate of one for a display currency it has no rate for", async () => {
    // `displayCurrency` never builds one, but the rate is a column that must
    // never be left to chance.
    await placeOrder("tok", input, { ...context, display: { code: "EUR", options: [] } });

    expect(created()).toMatchObject({ displayCurrency: "EUR", exchangeRate: "1" });
  });

  it("ships free at the threshold", async () => {
    db.tx.cart.findFirst.mockResolvedValue({ id: "cart_1", items: [line("a", "25.00", 2)] });

    await placeOrder("tok", input, context);

    expect(created()).toMatchObject({ subtotal: "50.00", shippingTotal: "0.00", grandTotal: "50.00" });
  });

  it("records the reader's currency and its rate (decision 5)", async () => {
    await placeOrder("tok", input, {
      ...context,
      display: displayCurrency([{ base: "USD", quote: "EUR", rate: "0.92" }], "EUR"),
    });

    expect(created()).toMatchObject({ displayCurrency: "EUR", exchangeRate: "0.92", currency: "USD" });
  });

  it("snapshots each line, writes both addresses, and opens the status history", async () => {
    await placeOrder("tok", { ...input, note: "Leave at the door" }, context);

    const data = created() as {
      items: { create: unknown[] };
      addresses: { create: { kind: string; city: string; line2: unknown }[] };
      statusHistory: { create: unknown };
      note: unknown;
    };
    expect(data.items.create).toEqual([
      {
        variantId: "var_a",
        productSnapshot: {
          productId: "prod_a",
          name: "Product a",
          sku: "SKU-a",
          options: [],
          imageId: null,
        },
        quantity: 1,
        unitPrice: "21.23",
        lineTotal: "21.23",
      },
    ]);
    // Billing is written as a copy of shipping when they are the same.
    expect(data.addresses.create.map((row) => [row.kind, row.city, row.line2])).toEqual([
      ["shipping", "Shanghai", null],
      ["billing", "Shanghai", null],
    ]);
    expect(data.statusHistory.create).toEqual({
      fromStatus: null,
      toStatus: "pending",
      actor: "customer",
    });
    expect(data.note).toBe("Leave at the door");
  });

  it("writes a separate billing address when one was given", async () => {
    await placeOrder(
      "tok",
      { ...input, billingSameAsShipping: false, billing: { ...address, city: "Beijing", region: "Beijing" } },
      context,
    );

    const data = created() as { addresses: { create: { kind: string; city: string }[] } };
    expect(data.addresses.create[1]).toMatchObject({ kind: "billing", city: "Beijing" });
  });

  it("takes the stock only where there is enough, and empties the ordered lines", async () => {
    await placeOrder("tok", input, context);

    expect(db.tx.productVariant.updateMany).toHaveBeenCalledWith({
      where: { id: "var_a", stock: { gte: 1 } },
      data: { stock: { decrement: 1 } },
    });
    expect(db.tx.cartItem.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["a"] } } });
  });

  it("leaves a line with an issue in the cart, and out of the order", async () => {
    db.tx.cart.findFirst.mockResolvedValue({
      id: "cart_1",
      items: [line("a", "21.23", 1), line("gone", "9.00", 1, 0)],
    });

    await placeOrder("tok", input, context);

    expect((created() as { items: { create: unknown[] } }).items.create).toHaveLength(1);
    expect(db.tx.cartItem.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["a"] } } });
  });

  it("rolls everything back when stock ran out in the meantime", async () => {
    db.tx.productVariant.updateMany.mockResolvedValue({ count: 0 });

    expect(await placeOrder("tok", input, context)).toEqual({ status: "stockChanged" });
    expect(db.tx.order.create).not.toHaveBeenCalled();
  });

  it.each([
    ["no cookie", undefined, undefined],
    ["no live cart", "tok", null],
    ["nothing buyable", "tok", { id: "cart_1", items: [line("gone", "9.00", 1, 0)] }],
  ])("has nothing to order with %s", async (_, token, cart) => {
    db.tx.cart.findFirst.mockResolvedValue(cart);

    expect(await placeOrder(token, input, context)).toEqual({ status: "empty" });
    expect(db.tx.order.create).not.toHaveBeenCalled();
  });

  it("finds the first order when the same form is submitted again", async () => {
    db.order.findUnique.mockResolvedValue({ orderNumber: 1001, accessKey: "key" });

    expect(await placeOrder("tok", input, context)).toEqual({
      status: "placed",
      orderNumber: 1001,
      accessKey: "key",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("answers with the winner when two submissions race for the key", async () => {
    db.order.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ orderNumber: 1001, accessKey: "key" });
    db.tx.order.create.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));

    expect(await placeOrder("tok", input, context)).toEqual({
      status: "placed",
      orderNumber: 1001,
      accessKey: "key",
    });
  });

  it("lets any other failure through", async () => {
    db.tx.order.create.mockRejectedValue(new Error("connection refused"));

    await expect(placeOrder("tok", input, context)).rejects.toThrow("connection refused");
  });

  it("lets a unique failure through when there is no winner to find", async () => {
    db.tx.order.create.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));

    await expect(placeOrder("tok", input, context)).rejects.toThrow("unique");
  });
});

describe("getOrder", () => {
  it("opens an order only with its number and its key together", async () => {
    db.order.findFirst.mockResolvedValue(null);

    expect(await getOrder(1001, "wrong")).toBeNull();
    expect(db.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orderNumber: 1001, accessKey: "wrong" } }),
    );
  });

  it("asks nothing without a key or with a number that is not one", async () => {
    expect(await getOrder(1001, "")).toBeNull();
    expect(await getOrder(Number.NaN, "key")).toBeNull();
    expect(db.order.findFirst).not.toHaveBeenCalled();
  });

  it("maps the order it finds", async () => {
    db.order.findFirst.mockResolvedValue({
      orderNumber: 1001,
      email: "ada@example.com",
      paymentMethod: "cod",
      shippingMethod: "standard",
      currency: "USD",
      displayCurrency: "USD",
      exchangeRate: decimal("1"),
      subtotal: decimal("21.23"),
      discountTotal: decimal("0.00"),
      couponCode: null,
      shippingTotal: decimal("5.00"),
      grandTotal: decimal("26.23"),
      note: null,
      createdAt: NOW,
      items: [],
      addresses: [],
    });

    expect(await getOrder(1001, "key")).toMatchObject({
      orderNumber: 1001,
      grandTotal: { amount: "26.23", currency: "USD" },
    });
  });
});

describe("placeOrder with a coupon", () => {
  /** A coupon as `redeemCoupon` selects it. */
  function couponRow(overrides: Record<string, unknown> = {}) {
    return {
      code: "SAVE10",
      type: "percentage",
      amount: decimal("10"),
      currency: null,
      appliesToAllProducts: true,
      expiresAt: new Date("2026-12-31T00:00:00.000Z"),
      products: [],
      ...overrides,
    };
  }

  const withCoupon: Checkout = { ...input, couponCode: "SAVE10" };

  it("takes the coupon's discount off, inside the transaction, and records the code", async () => {
    db.tx.coupon.findUnique.mockResolvedValue(couponRow());

    const result = await placeOrder("tok", withCoupon, context, NOW);

    expect(result).toMatchObject({ status: "placed" });
    expect(db.tx.coupon.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: "SAVE10" } }),
    );
    // 10% of 21.23 is 2.123 → 2.12; delivery stays $5.00.
    expect(created()).toMatchObject({
      subtotal: "21.23",
      discountTotal: "2.12",
      couponCode: "SAVE10",
      shippingTotal: "5.00",
      grandTotal: "24.11",
    });
  });

  it("reads the free-shipping threshold before the discount", async () => {
    db.tx.cart.findFirst.mockResolvedValue({ id: "cart_1", items: [line("a", "25.00", 2)] });
    db.tx.coupon.findUnique.mockResolvedValue(
      couponRow({ type: "fixed_amount", amount: decimal("5.00"), currency: "USD" }),
    );

    await placeOrder("tok", withCoupon, context, NOW);

    expect(created()).toMatchObject({
      subtotal: "50.00",
      discountTotal: "5.00",
      shippingTotal: "0.00",
      grandTotal: "45.00",
    });
  });

  it("discounts only the lines whose product the coupon names", async () => {
    db.tx.cart.findFirst.mockResolvedValue({
      id: "cart_1",
      items: [line("a", "21.23", 1), line("b", "10.00", 1)],
    });
    db.tx.coupon.findUnique.mockResolvedValue(
      couponRow({ appliesToAllProducts: false, products: [{ productId: "prod_b" }] }),
    );

    await placeOrder("tok", withCoupon, context, NOW);

    expect(created()).toMatchObject({ discountTotal: "1.00", grandTotal: "35.23" });
  });

  it.each([
    ["unknown", null],
    ["expired", couponRow({ expiresAt: new Date("2026-10-01T00:00:00.000Z") })],
    ["notApplicable", couponRow({ appliesToAllProducts: false, products: [{ productId: "prod_z" }] })],
  ])("refuses a coupon that is %s, without taking stock or writing", async (reason, row) => {
    db.tx.coupon.findUnique.mockResolvedValue(row);

    const result = await placeOrder("tok", withCoupon, context, NOW);

    expect(result).toEqual({ status: "couponRefused", reason });
    expect(db.tx.productVariant.updateMany).not.toHaveBeenCalled();
    expect(db.tx.order.create).not.toHaveBeenCalled();
    expect(db.tx.cartItem.deleteMany).not.toHaveBeenCalled();
  });

  it("looks up no coupon, and records none, without a code", async () => {
    await placeOrder("tok", input, context, NOW);

    expect(db.tx.coupon.findUnique).not.toHaveBeenCalled();
    expect(created()).toMatchObject({ discountTotal: "0.00", couponCode: null });
  });
});
