import { prisma, type Prisma } from "@my-ecommerce/db";
import type { Money } from "@my-ecommerce/shared";
import { ORDER_SELECT, toOrderView, type OrderView } from "@/lib/checkout/order-rows";

/**
 * Orders, as the admin's order list reads them.
 *
 * Every order, guest and account alike — unlike `lib/account/orders-repo.ts`,
 * which is one customer's history and is scoped to their session. The two
 * disagree on who may see what, so they are two files.
 *
 * Totals stay in the shop's currency. The shopper may have been reading in
 * another, but what the shop agreed to and will be paid is `currency`, and
 * converting it here would be converting the shop's own books.
 */

export type AdminOrderStatus = Prisma.OrderGetPayload<{
  select: { status: true };
}>["status"];

/** One order, as the list draws it. */
export interface AdminOrderSummary {
  id: string;
  orderNumber: number;
  email: string;
  /** The shipping address's name, or "" for an order without one. */
  customerName: string;
  /** Whether the order was placed while signed in to an account. */
  isGuest: boolean;
  status: AdminOrderStatus;
  /** Units bought, summed over the lines. */
  itemCount: number;
  grandTotal: Money;
  /** ISO 8601, formatted at the edge like every other date in the contract. */
  createdAt: string;
}

/**
 * Every order, newest first.
 *
 * No `take`, mirroring the other admin lists: paging is a change of its own the
 * day the shop needs it.
 */
export async function listOrders(): Promise<AdminOrderSummary[]> {
  const rows = await prisma.order.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      orderNumber: true,
      email: true,
      customerId: true,
      status: true,
      currency: true,
      grandTotal: true,
      createdAt: true,
      items: { select: { quantity: true } },
      addresses: {
        where: { kind: "shipping" },
        select: { firstName: true, lastName: true },
      },
    },
  });

  return rows.map((row) => {
    const shipping = row.addresses.at(0);

    return {
      id: row.id,
      orderNumber: row.orderNumber,
      email: row.email,
      customerName: shipping
        ? `${shipping.firstName} ${shipping.lastName}`.trim()
        : "",
      isGuest: row.customerId === null,
      status: row.status,
      itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
      grandTotal: { amount: row.grandTotal.toString(), currency: row.currency },
      createdAt: row.createdAt.toISOString(),
    };
  });
}

/** One order, as the admin's detail screen draws it. */
export interface AdminOrderDetail extends OrderView {
  status: AdminOrderStatus;
  isGuest: boolean;
  /** Every transition the order has made, oldest first. */
  history: {
    id: string;
    fromStatus: AdminOrderStatus | null;
    toStatus: AdminOrderStatus;
    actor: string;
    note: string | null;
    /** ISO 8601. */
    changedAt: string;
  }[];
}

/**
 * One order by its number, or null when there is none.
 *
 * By number and without the access key the confirmation page asks for: the
 * key is the shopper's capability, and the admin shell has already decided
 * this reader may see every order. The lines, totals and addresses go through
 * the checkout's own `toOrderView`, so an order reads here exactly as its
 * confirmation page shows it to the shopper.
 */
export async function getOrderForAdmin(
  orderNumber: number,
): Promise<AdminOrderDetail | null> {
  if (!Number.isSafeInteger(orderNumber)) return null;

  const row = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      ...ORDER_SELECT,
      status: true,
      customerId: true,
      statusHistory: {
        orderBy: [{ changedAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          actor: true,
          note: true,
          changedAt: true,
        },
      },
    },
  });

  if (!row) return null;

  return {
    ...toOrderView(row),
    status: row.status,
    isGuest: row.customerId === null,
    history: row.statusHistory.map((entry) => ({
      ...entry,
      changedAt: entry.changedAt.toISOString(),
    })),
  };
}
