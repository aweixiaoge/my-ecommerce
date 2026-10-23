import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOrderForAdmin, listOrders } from "./orders-repo";

/**
 * The order list's read, against a stand-in for the database — the lane has no
 * external services, so what is asserted is the query's shape and what a row
 * becomes on the screen.
 */
const db = vi.hoisted(() => ({
  order: { findMany: vi.fn(), findUnique: vi.fn() },
}));

vi.mock("@my-ecommerce/db", () => ({ prisma: { order: db.order } }));

/** A row as the list's select returns one. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "ord_1",
    orderNumber: 1042,
    email: "ada@example.com",
    customerId: "cus_1",
    status: "pending",
    paymentMethod: "cod",
    currency: "USD",
    // A Prisma Decimal, as far as this read cares: something with toString.
    grandTotal: { toString: () => "129.50" },
    createdAt: new Date("2026-10-21T08:00:00.000Z"),
    items: [{ quantity: 2 }, { quantity: 1 }],
    addresses: [{ firstName: "Ada", lastName: "Lovelace" }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.order.findMany.mockResolvedValue([]);
});

describe("listOrders", () => {
  it("takes every order, guests' included, newest first", async () => {
    await listOrders();

    const [args] = db.order.findMany.mock.calls[0] as [
      { where?: unknown; orderBy: unknown },
    ];
    expect(args.where).toBeUndefined();
    expect(args.orderBy).toEqual([{ createdAt: "desc" }, { id: "asc" }]);
  });

  it("turns a row into what the list draws", async () => {
    db.order.findMany.mockResolvedValue([row()]);

    const [order] = await listOrders();

    expect(order).toEqual({
      id: "ord_1",
      orderNumber: 1042,
      email: "ada@example.com",
      customerName: "Ada Lovelace",
      isGuest: false,
      status: "pending",
      itemCount: 3,
      grandTotal: { amount: "129.50", currency: "USD" },
      createdAt: "2026-10-21T08:00:00.000Z",
    });
  });

  it("marks an order with no account as a guest's", async () => {
    db.order.findMany.mockResolvedValue([row({ customerId: null })]);

    const [order] = await listOrders();

    expect(order?.isGuest).toBe(true);
  });

  it("leaves the name blank for an order with no shipping address", async () => {
    db.order.findMany.mockResolvedValue([row({ addresses: [] })]);

    const [order] = await listOrders();

    expect(order?.customerName).toBe("");
  });
});

/** A row as the detail screen's select returns one. */
function detailRow(overrides: Record<string, unknown> = {}) {
  const decimal = (value: string) => ({ toString: () => value });

  return {
    orderNumber: 1042,
    email: "ada@example.com",
    paymentMethod: "cod",
    shippingMethod: "standard",
    currency: "USD",
    displayCurrency: "USD",
    exchangeRate: decimal("1"),
    subtotal: decimal("120.00"),
    discountTotal: decimal("0.00"),
    couponCode: null,
    shippingTotal: decimal("9.50"),
    grandTotal: decimal("129.50"),
    note: null,
    createdAt: new Date("2026-10-21T08:00:00.000Z"),
    items: [
      {
        id: "item_1",
        productSnapshot: {
          productId: "prod_1",
          name: "Earbud Wireless",
          sku: "EB-1",
          options: [{ option: "Color", value: "Black" }],
          imageId: null,
        },
        quantity: 2,
        unitPrice: decimal("60.00"),
        lineTotal: decimal("120.00"),
      },
    ],
    addresses: [],
    status: "pending",
    customerId: null,
    statusHistory: [
      {
        id: "hist_1",
        fromStatus: null,
        toStatus: "pending",
        actor: "customer",
        note: null,
        changedAt: new Date("2026-10-21T08:00:00.000Z"),
      },
    ],
    ...overrides,
  };
}

describe("getOrderForAdmin", () => {
  it("finds the order by its number alone, with no access key", async () => {
    db.order.findUnique.mockResolvedValue(null);

    await getOrderForAdmin(1042);

    const [args] = db.order.findUnique.mock.calls[0] as [{ where: unknown }];
    expect(args.where).toEqual({ orderNumber: 1042 });
  });

  it("does not query for a number that is not one", async () => {
    expect(await getOrderForAdmin(Number.NaN)).toBeNull();
    expect(db.order.findUnique).not.toHaveBeenCalled();
  });

  it("is null when there is no such order", async () => {
    db.order.findUnique.mockResolvedValue(null);

    expect(await getOrderForAdmin(9999)).toBeNull();
  });

  it("reads lines and totals the way the confirmation page does", async () => {
    db.order.findUnique.mockResolvedValue(detailRow());

    const order = await getOrderForAdmin(1042);

    expect(order?.items).toEqual([
      expect.objectContaining({
        name: "Earbud Wireless",
        sku: "EB-1",
        options: [{ option: "Color", value: "Black" }],
        quantity: 2,
        lineTotal: { amount: "120.00", currency: "USD" },
      }),
    ]);
    expect(order?.grandTotal).toEqual({ amount: "129.50", currency: "USD" });
  });

  it("adds the status, who placed it, and its history", async () => {
    db.order.findUnique.mockResolvedValue(detailRow());

    const order = await getOrderForAdmin(1042);

    expect(order?.status).toBe("pending");
    expect(order?.isGuest).toBe(true);
    expect(order?.history).toEqual([
      {
        id: "hist_1",
        fromStatus: null,
        toStatus: "pending",
        actor: "customer",
        note: null,
        changedAt: "2026-10-21T08:00:00.000Z",
      },
    ]);
  });
});
