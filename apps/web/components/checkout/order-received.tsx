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
 * checkout's own vocabulary in the storefront's luxury register: the thanks as
 * an italic serif line under a gold tick, the facts on an ivory band in small
 * tracked capitals, serif headings and totals, and the addresses on ivory.
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
    <div className="text-[14px] leading-[22px] text-ink">
      <div className="flex flex-col items-center text-center">
        <span aria-hidden className="flex size-[52px] items-center justify-center rounded-full border border-gold text-gold">
          <svg viewBox="0 0 20 20" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4.5 10.5 3.5 3.5 7.5-8" />
          </svg>
        </span>
        <p className="max-w-[560px] pt-5 font-display text-[22px] leading-[32px] text-ink-62 italic">
          {received.thanks}
        </p>
      </div>

      <dl className="mt-[40px] grid grid-cols-2 gap-y-[20px] bg-ivory px-6 py-6 sm:grid-cols-3 sm:px-8 lg:grid-cols-5">
        <Fact label={received.number} value={`#${order.orderNumber}`} />
        <Fact label={received.date} value={formatDate(order.createdAt, locale)} />
        <Fact label={received.email} value={order.email} />
        <Fact label={received.total} value={price(order.grandTotal)} />
        <Fact
          label={received.payment}
          value={order.paymentMethod === "cod" ? messages.cod : order.paymentMethod}
        />
      </dl>

      <div className="grid grid-cols-1 gap-[56px] pt-[56px] lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="order-details">
          <h2
            id="order-details"
            className="pb-5 font-display text-[26px] leading-[34px] font-normal"
          >
            {received.details}
          </h2>

          <ul className="border-t border-ink">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-[20px] border-b border-line py-[20px]">
                <div className="relative size-[72px] shrink-0 overflow-hidden bg-ivory">
                  {item.image && (
                    <Image src={item.image.url} alt={item.name} fill sizes="72px" className="object-cover" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
                  <p className="font-display text-[17px] leading-[24px] [overflow-wrap:anywhere]">
                    {item.name}{" "}
                    <span className="font-sans text-[13px] text-ink-55 tabular-nums">× {item.quantity}</span>
                  </p>
                  <p className="text-[13px] text-ink-60 tabular-nums">{price(item.unitPrice)}</p>
                  {item.options.map((option) => (
                    <p key={`${option.option}:${option.value}`} className="text-[13px] text-ink-62">
                      {option.option ? `${option.option}: ${option.value}` : option.value}
                    </p>
                  ))}
                </div>
                <p className="text-right font-display text-[17px] leading-[24px] tabular-nums">{price(item.lineTotal)}</p>
              </li>
            ))}
          </ul>

          <dl className="flex flex-col gap-[12px] pt-[20px] text-ink-62">
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
            <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-ink pt-[20px] text-ink">
              <dt className="text-[11px] leading-4 font-medium tracking-[0.18em] text-ink uppercase">{received.total}</dt>
              <dd className="font-display text-[28px] leading-[36px] tabular-nums">{price(order.grandTotal)}</dd>
            </div>
          </dl>

          {order.note && (
            <div className="mt-[32px] border-l-2 border-gold bg-ivory px-5 py-4">
              <h3 className="text-[11px] leading-4 font-medium tracking-[0.18em] text-ink-55 uppercase">{received.note}</h3>
              <p className="pt-2 font-display text-[17px] leading-[26px] whitespace-pre-line text-ink-62 italic">{order.note}</p>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-[20px] self-start">
          {order.shipping && (
            <AddressBlock title={received.shippingAddress} address={order.shipping} locale={locale} />
          )}
          {order.billing && (
            <AddressBlock title={received.billingAddress} address={order.billing} locale={locale} />
          )}
          <Link
            href={localePath(locale, "/shop")}
            className="flex h-[52px] items-center justify-center border border-ink bg-ink px-[20px] text-[13px] leading-5 font-medium tracking-[0.14em] text-paper uppercase transition-colors duration-300 hover:bg-paper hover:text-ink"
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
      <dt className="text-[11px] leading-4 font-medium tracking-[0.18em] text-ink-55 uppercase">{label}</dt>
      <dd className="truncate pt-[6px] font-display text-[17px] leading-[24px] text-ink">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="text-right text-ink tabular-nums">{value}</dd>
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
    <section className="bg-ivory px-7 py-6">
      <h2 className="pb-3 font-display text-[22px] leading-[30px] font-normal">{title}</h2>
      <address className="flex flex-col gap-[2px] border-t border-ink/15 pt-3 text-ink-62 not-italic">
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
