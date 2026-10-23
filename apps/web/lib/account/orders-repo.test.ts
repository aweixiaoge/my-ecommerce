import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACCOUNT_ORDERS_LIMIT, customerOrders } from "./orders-repo";

/**
 * The Orders tab's read, against a stand-in for the database. What matters is
 * the filter — a customer's own orders and nobody else's, never matched by
 * email — and what the rows say once they are read.
 */
const db = vi.hoisted(() => ({ order: { findMany: vi.fn() } }));

vi.mock("@my-ecommerce/db", () => ({ prisma: db }));

const decimal = (value: string) => ({ toString: () => value });

const row = (overrides: Record<string, unknown> = {}) => ({
  orderNumber: 1043,
  createdAt: new Date("2026-10-14T09:30:00.000Z"),
  status: "processing",
  currency: "USD",
  displayCurrency: "USD",
  exchangeRate: decimal("1"),
  grandTotal: decimal("56.00"),
  accessKey: "key_1",
  items: [{ quantity: 2 }, { quantity: 1 }],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("customerOrders", () => {
  it("asks for this customer's orders only, newest first, capped", async () => {
    db.order.findMany.mockResolvedValue([]);

    await customerOrders("c_1");

    const query = db.order.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ customerId: "c_1" });
    expect(query.orderBy).toEqual({ createdAt: "desc" });
    expect(query.take).toBe(ACCOUNT_ORDERS_LIMIT);
  });

  it("counts units rather than lines, and keeps the total in the shop's currency", async () => {
    db.order.findMany.mockResolvedValue([row()]);

    const [order] = await customerOrders("c_1");

    expect(order).toMatchObject({
      orderNumber: 1043,
      createdAt: "2026-10-14T09:30:00.000Z",
      status: "processing",
      grandTotal: { amount: "56.00", currency: "USD" },
      itemCount: 3,
      accessKey: "key_1",
    });
    expect(order!.display).toEqual({ code: "USD", options: [{ code: "USD", rate: "1" }] });
  });

  it("carries the rate an order was placed at, so its total reads as it did then", async () => {
    db.order.findMany.mockResolvedValue([row({ displayCurrency: "EUR", exchangeRate: decimal("0.9200000000") })]);

    const [order] = await customerOrders("c_1");

    expect(order!.display).toEqual({
      code: "EUR",
      options: [
        { code: "USD", rate: "1" },
        { code: "EUR", rate: "0.9200000000" },
      ],
    });
  });
});
