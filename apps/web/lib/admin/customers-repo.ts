import { prisma } from "@my-ecommerce/db";

/**
 * Customers, as the admin's customer list reads them.
 *
 * Every account the storefront's register form has opened. A module of its own
 * rather than a corner of `lib/account/`, because that one is the customer's
 * view of themselves and is always scoped to one session; this one is the
 * shop's view of everybody, and keeping the two apart is what keeps a
 * signed-in shopper's read from ever growing a "list them all" branch.
 *
 * The password hash is never selected. Nothing on this screen needs it, and a
 * column that is not read cannot leak.
 */

/** One customer, as the list draws it. */
export interface AdminCustomerSummary {
  id: string;
  email: string;
  /** The language the account was opened in. */
  locale: string;
  /** Orders placed while signed in to this account; guest orders are not counted. */
  orderCount: number;
  /** ISO 8601, formatted at the edge like every other date in the contract. */
  createdAt: string;
}

/**
 * Every customer, newest first.
 *
 * No `take`, mirroring `listReviewsForModeration`: the shop is small, and
 * paging is a change of its own the day it is needed.
 */
export async function listCustomers(): Promise<AdminCustomerSummary[]> {
  const rows = await prisma.customer.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      email: true,
      locale: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    locale: row.locale,
    orderCount: row._count.orders,
    createdAt: row.createdAt.toISOString(),
  }));
}
