import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Money } from "@my-ecommerce/shared";
import { getOrderForAdmin } from "@/lib/admin/orders-repo";
import { countryName } from "@/lib/checkout/countries";
import type { OrderAddressView } from "@/lib/checkout/order-rows";
import { formatDate, formatMoney } from "@/lib/format";

/**
 * One order, in full: what was bought, what was paid, where it goes, and every
 * status it has been through.
 *
 * Addressed by the order number — the number on the shopper's confirmation and
 * in their emails, so it is the one a person will search for — rather than the
 * row id, which is never shown anywhere.
 *
 * Money is in the shop's currency through `formatMoney`, for the reason the
 * list gives. Read-only for now; changing the status is a change of its own.
 */
export async function generateMetadata({
  params,
}: PageProps<"/admin/orders/[orderNumber]">): Promise<Metadata> {
  return { title: `Order #${(await params).orderNumber}` };
}

/** Allowed to block, for the reason the product list gives. */
export const instant = false;

export default async function AdminOrderPage({
  params,
}: PageProps<"/admin/orders/[orderNumber]">) {
  await connection();

  const { orderNumber } = await params;
  // `Number("")` is 0 and `Number("1e3")` is 1000, so only plain digits are an
  // order number; anything else is a page that does not exist.
  const order = /^\d+$/.test(orderNumber)
    ? await getOrderForAdmin(Number(orderNumber))
    : null;

  if (!order) notFound();

  return (
    <div className="flex max-w-[960px] flex-col gap-8">
      <div>
        <Link
          href="/admin/orders"
          className="text-[12px] leading-[19.8px] text-ink-55 transition-colors hover:text-ink"
        >
          ← Orders
        </Link>

        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
            Order #{order.orderNumber}
          </h1>
          <span className="rounded-control bg-mist px-2 py-0.5 text-[12px] leading-[19.8px] text-ink-62">
            {order.status}
          </span>
        </div>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          Placed {formatDate(order.createdAt)} by {order.email}
          {order.isGuest ? " as a guest." : "."}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-card border border-line p-5 sm:grid-cols-4">
        <Fact label="Payment">{order.paymentMethod}</Fact>
        <Fact label="Shipping">{order.shippingMethod}</Fact>
        <Fact label="Currency">{order.grandTotal.currency}</Fact>
        <Fact label="Shopper read in">{order.display.code}</Fact>
      </dl>

      <section className="flex flex-col gap-3">
        <SectionHeading>Items</SectionHeading>

        <table className="w-full border-collapse text-left">
          <caption className="sr-only">The lines of this order.</caption>
          <thead>
            <tr className="border-b border-line">
              <Th>Product</Th>
              <Th>SKU</Th>
              <Th>Price</Th>
              <Th>Qty</Th>
              <Th>Total</Th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-line align-top">
                <td className="py-3 pr-4">
                  <div className="flex items-start gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-control bg-mist">
                      {item.image && (
                        <Image
                          src={item.image.url}
                          alt={item.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <span className="text-[13px] font-medium text-ink">{item.name}</span>
                      {item.options.length > 0 && (
                        <span className="block text-[12px] leading-[19.8px] text-ink-55">
                          {item.options
                            .map((option) => `${option.option}: ${option.value}`)
                            .join(" · ")}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62">
                  {item.sku || "—"}
                </td>
                <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62 tabular-nums">
                  {formatMoney(item.unitPrice)}
                </td>
                <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62 tabular-nums">
                  {item.quantity}
                </td>
                <td className="py-3 text-[13px] leading-[21.45px] text-ink tabular-nums">
                  {formatMoney(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto flex w-full max-w-[320px] flex-col gap-1.5 pt-2">
          <Total label="Subtotal" money={order.subtotal} />
          {order.couponCode && (
            <Total label={`Discount (${order.couponCode})`} money={order.discountTotal} negative />
          )}
          <Total label="Shipping" money={order.shippingTotal} />
          <div className="mt-1 border-t border-line pt-2">
            <Total label="Total" money={order.grandTotal} strong />
          </div>
        </dl>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="flex flex-col gap-3">
          <SectionHeading>Shipping address</SectionHeading>
          <Address address={order.shipping} />
        </section>
        <section className="flex flex-col gap-3">
          <SectionHeading>Billing address</SectionHeading>
          <Address address={order.billing} />
        </section>
      </div>

      {order.note && (
        <section className="flex flex-col gap-3">
          <SectionHeading>Note from the customer</SectionHeading>
          <p className="whitespace-pre-line text-[13px] leading-[21.45px] text-ink-62">
            {order.note}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <SectionHeading>History</SectionHeading>
        {order.history.length === 0 ? (
          <p className="text-[13px] leading-[21.45px] text-ink-62">No history recorded.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {order.history.map((entry) => (
              <li key={entry.id} className="text-[13px] leading-[21.45px] text-ink-62">
                <span className="text-ink">
                  {entry.fromStatus ? `${entry.fromStatus} → ${entry.toStatus}` : `Placed as ${entry.toStatus}`}
                </span>{" "}
                by {entry.actor} · {formatDate(entry.changedAt)}
                {entry.note && <span className="block text-ink-55">{entry.note}</span>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[12px] tracking-[0.5px] text-ink-55 uppercase">{children}</h2>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-2 pr-4 text-[12px] font-normal tracking-[0.5px] text-ink-55 uppercase">
      {children}
    </th>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] tracking-[0.5px] text-ink-55 uppercase">{label}</dt>
      <dd className="mt-0.5 text-[13px] text-ink">{children}</dd>
    </div>
  );
}

function Total({
  label,
  money,
  strong = false,
  negative = false,
}: {
  label: string;
  money: Money;
  strong?: boolean;
  /** Written as taken off — a discount. */
  negative?: boolean;
}) {
  const tone = strong ? "font-medium text-ink" : "text-ink-62";

  return (
    <div className={`flex justify-between text-[13px] leading-[21.45px] tabular-nums ${tone}`}>
      <dt>{label}</dt>
      <dd>
        {negative ? "−" : ""}
        {formatMoney(money)}
      </dd>
    </div>
  );
}

function Address({ address }: { address: OrderAddressView | null }) {
  if (!address) {
    return <p className="text-[13px] leading-[21.45px] text-ink-62">None given.</p>;
  }

  return (
    <address className="flex flex-col text-[13px] leading-[21.45px] text-ink-62 not-italic">
      <span className="text-ink">
        {address.firstName} {address.lastName}
      </span>
      <span>{address.line1}</span>
      {address.line2 && <span>{address.line2}</span>}
      <span>
        {address.postalCode} {address.city}
        {address.region ? `, ${address.region}` : ""}
      </span>
      <span>{countryName(address.countryCode, "en")}</span>
      {address.phone && <span>{address.phone}</span>}
    </address>
  );
}
