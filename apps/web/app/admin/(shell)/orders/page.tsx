import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { listOrders } from "@/lib/admin/orders-repo";
import { formatDate, formatMoney } from "@/lib/format";

/**
 * The order list.
 *
 * Every order the checkout has placed, guests' included, newest first. Totals
 * are in the shop's currency through `formatMoney` rather than `formatPrice` —
 * this is the shop's ledger, not a price shown to a shopper.
 *
 * Read-only for now: "View" opens an order's detail screen, and the status
 * transitions out of `pending` arrive with a later change to it.
 */
export const metadata: Metadata = {
  title: "Order",
};

/** Allowed to block, for the reason the product list gives. */
export const instant = false;

export default async function AdminOrdersPage() {
  await connection();

  const orders = await listOrders();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
          Order
        </h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          {orders.length === 1 ? "1 order." : `${orders.length} orders.`}
        </p>
      </div>

      {orders.length === 0 ? (
        <p className="text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          No orders have been placed yet.
        </p>
      ) : (
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Every order in the store, newest first.</caption>

          <thead>
            <tr className="border-b border-line">
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Items</Th>
              <Th>Total</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-line align-top">
                <td className="py-3 pr-4 text-[13px] font-medium text-ink tabular-nums">
                  #{order.orderNumber}
                  {/* Under the number rather than a column of its own, so the
                      row — and "View" at the end of it — fits a narrow window. */}
                  <span className="block whitespace-nowrap text-[12px] font-normal leading-[19.8px] text-ink-55">
                    {formatDate(order.createdAt)}
                  </span>
                </td>
                <td className="py-3 pr-4 text-[13px] text-ink">
                  {order.customerName || "—"}
                  <span className="block text-[12px] leading-[19.8px] text-ink-55">
                    {order.email}
                    {order.isGuest && <span className="whitespace-nowrap"> · guest</span>}
                  </span>
                </td>
                <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62 tabular-nums">
                  {order.itemCount}
                </td>
                <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62 tabular-nums">
                  {formatMoney(order.grandTotal)}
                </td>
                <td className="py-3 pr-4">
                  <span className="rounded-control bg-mist px-2 py-0.5 text-[12px] leading-[19.8px] text-ink-62">
                    {order.status}
                  </span>
                </td>
                <td className="py-3">
                  {/* The order number in the label, because "View" repeated
                      down a column says nothing about which row it is in. */}
                  <Link
                    href={`/admin/orders/${order.orderNumber}`}
                    aria-label={`View order #${order.orderNumber}`}
                    className="inline-flex h-7 items-center rounded-control border border-line px-2 text-[12px] leading-[19.8px] text-ink transition-colors hover:bg-mist"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-2 pr-4 text-[12px] font-normal tracking-[0.5px] text-ink-55 uppercase">
      {children}
    </th>
  );
}
