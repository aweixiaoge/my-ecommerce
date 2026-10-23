import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCustomers } from "./customers-repo";

/**
 * The customer list's read, against a stand-in for the database — the lane has
 * no external services, so what is asserted is the query's shape and what a row
 * becomes on the screen.
 */
const db = vi.hoisted(() => ({
  customer: { findMany: vi.fn() },
}));

vi.mock("@my-ecommerce/db", () => ({ prisma: { customer: db.customer } }));

beforeEach(() => {
  vi.clearAllMocks();
  db.customer.findMany.mockResolvedValue([]);
});

describe("listCustomers", () => {
  it("takes every customer, newest first", async () => {
    await listCustomers();

    expect(db.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
    );
  });

  it("never selects the password hash", async () => {
    await listCustomers();

    const [args] = db.customer.findMany.mock.calls[0] as [
      { select: Record<string, unknown> },
    ];
    expect(args.select).not.toHaveProperty("passwordHash");
  });

  it("turns a row into what the list draws", async () => {
    db.customer.findMany.mockResolvedValue([
      {
        id: "cus_1",
        email: "ada@example.com",
        locale: "de",
        createdAt: new Date("2026-10-21T08:00:00.000Z"),
        _count: { orders: 3 },
      },
    ]);

    expect(await listCustomers()).toEqual([
      {
        id: "cus_1",
        email: "ada@example.com",
        locale: "de",
        orderCount: 3,
        createdAt: "2026-10-21T08:00:00.000Z",
      },
    ]);
  });
});
