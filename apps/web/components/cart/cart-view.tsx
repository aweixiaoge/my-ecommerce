import Image from "next/image";
import Link from "next/link";
import {
  CART_LINE_QUANTITY_MAX,
  type Cart,
  type CartItem,
} from "@my-ecommerce/shared";
import { updateCartLineAction } from "@/app/[lang]/cart/actions";
import { shipsFree } from "@/lib/cart/shipping";
import { productPath } from "@/lib/catalog/product-path";
import type { DisplayCurrency } from "@/lib/currency/display";
import { formatPrice } from "@/lib/format";
import { fill, plural } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/languages";
import { CheckoutLink } from "./checkout-link";

/**
 * The cart's contents (Figma 178:4433): a table of lines, and the totals
 * column beside it — in the storefront's luxury register: column heads in small
 * tracked capitals, serif product names on ivory photographs, a square
 * quantity stepper, and the totals on an ivory panel.
 *
 * A Server Component with no state of its own. Every control is a submit
 * button in a form posting to `updateCartLineAction`, carrying the quantity it
 * means — "−" on two sends one, the bin sends zero — so the page works before
 * its JavaScript has loaded, and what is drawn after a press is the server's
 * answer rather than a guess the browser made. The same choice the currency
 * switcher makes for the same reason.
 *
 * Every figure is the server's, written in the reader's currency at the last
 * moment (`formatPrice`). A line total is converted on its own rather than as
 * converted price × quantity, so in a converted currency the two can differ by
 * a cent of rounding; the shop's own currency is exact, and checkout is where
 * the charged figure gets fixed.
 */
export function CartView({
  cart,
  messages,
  locale,
  currency,
}: {
  cart: Cart;
  /** This locale's `cart` slice of the catalog. */
  messages: Messages["cart"];
  locale: Locale;
  currency: DisplayCurrency;
}) {
  return (
    // The design's two columns — 1142 of table and 360 of totals on its 1550
    // column, 48 apart — from `lg`. Below it the totals sit under the table:
    // at 768–1023 a 360px column leaves the table too little room for a name.
    <div className="grid grid-cols-1 gap-[56px] pt-[56px] lg:grid-cols-[1fr_380px]">
      {/*
        A real table, as the design's layer names it: a line is a row of
        Product and Total, and a screen reader can say which column a figure
        is in.
      */}
      <table className="w-full self-start border-collapse text-[14px] leading-[22px] text-ink">
        <thead>
          <tr className="border-b border-ink">
            <th colSpan={2} scope="col" className="pt-2 pb-4 text-left text-[11px] leading-4 font-medium tracking-[0.18em] text-ink-55 uppercase">
              {messages.columns.product}
            </th>
            <th scope="col" className="pt-2 pb-4 text-right text-[11px] leading-4 font-medium tracking-[0.18em] text-ink-55 uppercase">
              {messages.columns.total}
            </th>
          </tr>
        </thead>
        <tbody>
          {cart.items.map((item) => (
            <Line
              key={item.id}
              item={item}
              messages={messages}
              locale={locale}
              currency={currency}
            />
          ))}
        </tbody>
      </table>

      <Totals cart={cart} messages={messages} locale={locale} currency={currency} />
    </div>
  );
}

/**
 * One row: the photograph; the name, price, options and quantity; the total.
 *
 * The design's columns are 80 (a 64px photograph and 16 of gutter), the rest,
 * and 100 for the total. The total column narrows on a phone, where 100px is a
 * third of the row.
 */
function Line({
  item,
  messages,
  locale,
  currency,
}: {
  item: CartItem;
  messages: Messages["cart"];
  locale: Locale;
  currency: DisplayCurrency;
}) {
  const href = productPath(item.product, locale);
  const { name } = item.product;

  // The most "+" can ask for: everything in stock, within the line's bound.
  const ceiling = Math.min(item.variant.stock, CART_LINE_QUANTITY_MAX);

  return (
    <tr className="border-b border-line align-top">
      {/* 64px on a phone, where 96 would leave the name a third of the row. */}
      <td className="w-[80px] py-[28px] pr-[16px] sm:w-[116px] sm:pr-[20px]">
        <Link href={href} className="relative block size-[64px] overflow-hidden bg-ivory sm:size-[96px]">
          {item.product.image && (
            <Image
              src={item.product.image.url}
              alt={item.product.image.alt ?? name}
              fill
              sizes="96px"
              className="object-cover"
            />
          )}
        </Link>
      </td>

      <td className="py-[28px]">
        <div className="flex flex-col gap-[4px]">
          <Link
            href={href}
            className="font-display text-[19px] leading-[26px] [overflow-wrap:anywhere] underline-offset-4 hover:underline"
          >
            {name}
          </Link>
          <p className="text-ink-60 tabular-nums">{formatPrice(item.variant.price, currency, locale)}</p>
          {item.optionValues
            .filter((value) => value.name !== "")
            .map((value) => (
              <p key={value.id} className="text-[13px] text-ink-62">
                {value.option
                  ? fill(messages.optionLabel, { option: value.option, value: value.name })
                  : value.name}
              </p>
            ))}
          {item.unavailableReason && (
            <p className="text-[13px] font-medium text-danger">
              {item.unavailableReason === "limitedStock"
                ? plural(item.variant.stock, messages.line.limitedStock)
                : messages.line[item.unavailableReason]}
            </p>
          )}

          <form action={updateCartLineAction} className="flex items-center gap-[16px] pt-3">
            <input type="hidden" name="itemId" value={item.id} />

            <div
              role="group"
              aria-label={messages.line.quantity}
              className="flex h-[40px] items-center border border-line"
            >
              <button
                type="submit"
                name="quantity"
                value={item.quantity - 1}
                aria-label={fill(messages.line.decrease, { name })}
                className="flex h-full w-[36px] items-center justify-center text-[15px] leading-[23.76px] text-ink-62 transition-colors hover:text-ink"
              >
                −
              </button>
              <output className="w-[44px] text-center leading-[13px] tabular-nums">{item.quantity}</output>
              <button
                type="submit"
                name="quantity"
                value={item.quantity + 1}
                aria-label={fill(messages.line.increase, { name })}
                disabled={item.quantity >= ceiling}
                className="flex h-full w-[36px] items-center justify-center text-[15px] leading-[23.76px] text-ink-62 transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
              >
                +
              </button>
            </div>

            <button
              type="submit"
              name="quantity"
              value={0}
              aria-label={fill(messages.line.removeLabel, { name })}
              className="flex size-[24px] items-center justify-center opacity-45 transition-opacity duration-300 hover:opacity-100"
            >
              <Image src="/icons/trash-outline.svg" alt="" width={24} height={24} />
            </button>
          </form>
        </div>
      </td>

      <td
        className={`w-[72px] py-[28px] text-right font-display text-[18px] leading-[26px] tabular-nums sm:w-[110px] ${
          item.unavailableReason ? "text-ink-55 line-through" : ""
        }`}
      >
        {formatPrice(item.lineTotal, currency, locale)}
      </td>
    </tr>
  );
}

/**
 * The totals column: coupons, shipping, the estimated total, and checkout.
 *
 * "Add coupons" opens on a pointer to the checkout, where a code is entered:
 * a coupon is judged against the order being placed, so that is where it lives.
 *
 * Shipping is the shop's own promise: free at or over the threshold the home
 * page's trust bar names (`lib/cart/shipping.ts`), which is the design's "Free
 * shipping — FREE" row. Under it the checkout quotes the rate once there is an
 * address, so the row says it is calculated at checkout and the estimate is the
 * subtotal alone.
 *
 * "Proceed to Checkout" goes there while anything in the cart can be bought
 * (`CheckoutLink`).
 */
function Totals({
  cart,
  messages,
  locale,
  currency,
}: {
  cart: Cart;
  messages: Messages["cart"];
  locale: Locale;
  currency: DisplayCurrency;
}) {
  const free = shipsFree(cart.subtotal);

  return (
    <aside aria-labelledby="cart-totals" className="self-start bg-ivory px-7 py-8 text-[14px] leading-[22px] text-ink">
      <h2 id="cart-totals" className="pb-5 font-display text-[26px] leading-[34px] font-normal">
        {messages.totals}
      </h2>

      <details className="group border-t border-ink/15 py-[18px]">
        <summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
          {messages.coupons}
          <Image
            src="/icons/chevron-down-24.svg"
            alt=""
            width={24}
            height={24}
            className="-my-[3px] transition-transform group-open:rotate-180"
          />
        </summary>
        <p className="pt-[12px] text-ink-62">{messages.couponsAtCheckout}</p>
      </details>

      <p className="flex justify-between gap-4 border-t border-ink/15 py-[18px]">
        <span>{free ? messages.freeShipping : messages.shipping}</span>
        <span className={free ? "text-[12px] font-medium tracking-[0.14em] text-gold uppercase" : "text-ink-62"}>
          {free ? messages.free : messages.shippingLater}
        </span>
      </p>

      <p className="flex items-baseline justify-between gap-4 border-t border-ink py-[20px]">
        <span className="text-[11px] leading-4 font-medium tracking-[0.18em] text-ink uppercase">{messages.estimatedTotal}</span>
        <span className="font-display text-[28px] leading-[36px] tabular-nums">{formatPrice(cart.grandTotal, currency, locale)}</span>
      </p>

      <div className="pt-[8px]">
        <CheckoutLink
          href={localePath(locale, "/checkout")}
          enabled={cart.itemCount > 0}
          className="flex h-[52px] w-full items-center justify-center px-[20px] uppercase border border-ink bg-ink text-[13px] leading-5 font-medium tracking-[0.14em] text-paper transition-colors duration-300 hover:bg-paper hover:text-ink"
        >
          {messages.checkout}
        </CheckoutLink>
      </div>
    </aside>
  );
}
