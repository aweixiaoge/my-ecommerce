import { prisma, type Prisma } from "@my-ecommerce/db";
import type { DisplayCurrency } from "@/lib/currency/display";
import type { Money } from "@my-ecommerce/shared";

/**
 * A customer's order history, for the account's Orders tab (Figma 178:7454).
 *
 * Owned orders only — `customer_id` is the account's — so a guest order placed
 * with the same email is not here. That is the rule `schema.prisma` gives for
 * the column, and the reason is that an email is not proof of anything until
 * it has been verified.
 */

/** One row of the table: what it shows, and the link "View" follows. */
export interface AccountOrderRow {
  orderNumber: number;
  /** ISO 8601, so it crosses to the page as a string. */
  createdAt: string;
  status: OrderStatus;
  grandTotal: Money;
  /** The currency and rate the order was placed in, as its confirmation shows it. */
  display: DisplayCurrency;
  /** Units bought, summed over the lines — "for 3 items". */
  itemCount: number;
  /**
   * The order's access key, which is what opens its page. Safe to hand to the
   * owner: it is their own order's capability, and this list is behind their
   * session.
   */
  accessKey: string;
}

export type OrderStatus = Prisma.OrderGetPayload<{ select: { status: true } }>["status"];

/**
 * The most an Orders tab shows. Woo pages at ten; a shop this size will not
 * reach a page of fifty for years, so the list is capped rather than paged and
 * the pager arrives with the first customer who needs it.
 */
export const ACCOUNT_ORDERS_LIMIT = 50;

export async function customerOrders(customerId: string): Promise<AccountOrderRow[]> {
  const rows = await prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take: ACCOUNT_ORDERS_LIMIT,
    select: {
      orderNumber: true,
      createdAt: true,
      status: true,
      currency: true,
      displayCurrency: true,
      exchangeRate: true,
      grandTotal: true,
      accessKey: true,
      items: { select: { quantity: true } },
    },
  });

  return rows.map((row) => ({
    orderNumber: row.orderNumber,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    grandTotal: { amount: row.grandTotal.toString(), currency: row.currency },
    // The shape `toOrderView` builds for the confirmation page, so a total
    // reads the same in the list as on the page "View" opens.
    display: {
      code: row.displayCurrency,
      options: [
        { code: row.currency, rate: "1" },
        ...(row.displayCurrency === row.currency
          ? []
          : [{ code: row.displayCurrency, rate: row.exchangeRate.toString() }]),
      ],
    },
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    accessKey: row.accessKey,
  }));
}
