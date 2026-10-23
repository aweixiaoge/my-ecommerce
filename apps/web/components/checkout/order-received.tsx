import Image from "next/image";
import Link from "next/link";
import { compareMoney, type Money } from "@my-ecommerce/shared";
import { countryName } from "@/lib/checkout/countries";
import type { OrderAddressView, OrderView } from "@/lib/checkout/order-rows";
import { formatDate, formatPrice } from "@/lib/format";
import type { Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/languages";

/**
 * Where an order lands once it is placed: the thanks, the facts a shopper
 * writes down (number, date, email, total, how they pay), what they bought and
 * where it is going.
 *
 * The Figma file has no frame for this page, so it is built from the
 * checkout's own vocabulary — its wash, its 20/28 headings, its hairlines and
 * its 13px rows — rather than inventing a new one.
 *
 * Every figure is the order's own, written in the currency and at the rate it
 * was placed at (`OrderView.display`), never the reader's current choice: this
 * is a record of a price that was agreed.
 */
export function OrderReceived({
  order,
  messages,
  locale,
}: {
  order: OrderView;
  /** This locale's `checkout` slice of the catalog. */
  messages: Messages["checkout"];
  locale: Locale;
}) {
  const received = messages.received;
  const price = (money: Money) => formatPrice(money, order.display, locale);
  const free =
    compareMoney(order.shippingTotal, { amount: "0", currency: order.shippingTotal.currency }) === 0;

  return (
    <div className="text-[13px] leading-[18.2px] tracking-[-0.08px] text-ink">
      <p className="text-[20px] leading-[28px] font-medium tracking-[-0.45px]">
        {received.thanks}
      </p>

      <dl className="mt-[24px] grid grid-cols-2 gap-y-[16px] border-y border-line py-[16px] sm:grid-cols-3 lg:grid-cols-5">
        <Fact label={received.number} value={`#${order.orderNumber}`} />
        <Fact label={received.date} value={formatDate(order.createdAt, locale)} />
        <Fact label={received.email} value={order.email} />
        <Fact label={received.total} value={price(order.grandTotal)} />
        <Fact
          label={received.payment}
          value={order.paymentMethod === "cod" ? messages.cod : order.paymentMethod}
        />
      </dl>

      <div className="grid grid-cols-1 gap-[48px] pt-[40px] lg:grid-cols-[1fr_360px]">
        <section aria-labelledby="order-details">
          <h2
            id="order-details"
            className="pb-[16px] text-[20px] leading-[28px] font-medium tracking-[-0.45px]"
          >
            {received.details}
          </h2>

          <ul className="border-t border-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-[16px] border-b border-line py-[16px]">
                <div className="relative size-[48px] shrink-0 overflow-hidden bg-mist">
                  {item.image && (
                    <Image src={item.image.url} alt={item.name} fill sizes="48px" className="object-cover" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
                  <p className="font-medium">
                    {item.name} <span className="font-normal text-ink-62">× {item.quantity}</span>
                  </p>
                  <p>{price(item.unitPrice)}</p>
                  {item.options.map((option) => (
                    <p key={`${option.option}:${option.value}`}>
                      {option.option ? `${option.option}: ${option.value}` : option.value}
                    </p>
                  ))}
                </div>
                <p className="text-right">{price(item.lineTotal)}</p>
              </li>
            ))}
          </ul>

          <dl className="flex flex-col gap-[12px] pt-[16px]">
            <Row label={received.subtotal} value={price(order.subtotal)} />
            {order.couponCode && (
              <Row
                label={`${received.discount} (${order.couponCode})`}
                value={`−${price(order.discountTotal)}`}
              />
            )}
            <Row
              label={received.shipping}
              value={`${messages.standard} — ${free ? messages.free : price(order.shippingTotal)}`}
            />
            <div className="flex justify-between gap-4 border-t border-line pt-[16px] text-[24px] leading-[33.6px] font-medium tracking-[0.07px]">
              <dt>{received.total}</dt>
              <dd>{price(order.grandTotal)}</dd>
            </div>
          </dl>

          {order.note && (
            <div className="pt-[24px]">
              <h3 className="font-medium">{received.note}</h3>
              <p className="pt-[4px] whitespace-pre-line">{order.note}</p>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-[24px] self-start">
          {order.shipping && (
            <AddressBlock title={received.shippingAddress} address={order.shipping} locale={locale} />
          )}
          {order.billing && (
            <AddressBlock title={received.billingAddress} address={order.billing} locale={locale} />
          )}
          <Link
            href={localePath(locale, "/shop")}
            className="flex h-[45px] items-center justify-center rounded-[3px] bg-ink px-[20px] text-[15px] leading-[24.75px] font-medium tracking-[-0.23px] text-paper"
          >
            {received.continue}
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 pr-[16px]">
      <dt className="text-ink-62 uppercase">{label}</dt>
      <dd className="truncate pt-[4px] font-semibold">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

/** An address the way a label is written: name, lines, city and region, country. */
function AddressBlock({
  title,
  address,
  locale,
}: {
  title: string;
  address: OrderAddressView;
  locale: Locale;
}) {
  const place = [address.city, address.region, address.postalCode].filter(Boolean).join(", ");

  return (
    <section className="rounded-[5px] border-[0.91px] border-line p-[16px]">
      <h2 className="pb-[8px] text-[20px] leading-[28px] font-medium tracking-[-0.45px]">{title}</h2>
      <address className="flex flex-col gap-[2px] not-italic">
        <span>
          {address.firstName} {address.lastName}
        </span>
        <span>{address.line1}</span>
        {address.line2 && <span>{address.line2}</span>}
        <span>{place}</span>
        <span>{countryName(address.countryCode, locale)}</span>
        {address.phone && <span>{address.phone}</span>}
      </address>
    </section>
  );
}
