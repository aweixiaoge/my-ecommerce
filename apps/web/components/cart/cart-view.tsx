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
 * column beside it.
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
    <div className="grid grid-cols-1 gap-[48px] pt-[40px] lg:grid-cols-[1fr_360px]">
      {/*
        A real table, as the design's layer names it: a line is a row of
        Product and Total, and a screen reader can say which column a figure
        is in.
      */}
      <table className="w-full border-collapse text-[13px] leading-[18.2px] tracking-[-0.076px] text-ink">
        <thead>
          <tr className="border-b border-line">
            <th colSpan={2} scope="col" className="pt-2 pb-3 text-left font-medium uppercase">
              {messages.columns.product}
            </th>
            <th scope="col" className="pt-2 pb-3 text-right font-medium uppercase">
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
      <td className="w-[80px] py-[20px] pr-[16px]">
        <Link href={href} className="relative block size-[64px] overflow-hidden bg-mist">
          {item.product.image && (
            <Image
              src={item.product.image.url}
              alt={item.product.image.alt ?? name}
              fill
              sizes="64px"
              className="object-cover"
            />
          )}
        </Link>
      </td>

      <td className="py-[20px]">
        <div className="flex flex-col gap-[4px]">
          <Link href={href} className="font-medium">
            {name}
          </Link>
          <p>{formatPrice(item.variant.price, currency, locale)}</p>
          {item.optionValues
            .filter((value) => value.name !== "")
            .map((value) => (
              <p key={value.id}>
                {value.option
                  ? fill(messages.optionLabel, { option: value.option, value: value.name })
                  : value.name}
              </p>
            ))}
          {item.unavailableReason && (
            <p className="font-semibold">
              {item.unavailableReason === "limitedStock"
                ? plural(item.variant.stock, messages.line.limitedStock)
                : messages.line[item.unavailableReason]}
            </p>
          )}

          <form action={updateCartLineAction} className="flex items-center gap-[12px]">
            <input type="hidden" name="itemId" value={item.id} />

            <div
              role="group"
              aria-label={messages.line.quantity}
              className="flex h-[40px] items-center rounded-[4px]"
            >
              <button
                type="submit"
                name="quantity"
                value={item.quantity - 1}
                aria-label={fill(messages.line.decrease, { name })}
                className="flex h-full w-[30px] items-center justify-center text-[14.4px] leading-[23.76px]"
              >
                −
              </button>
              <output className="w-[65px] text-center leading-[13px]">{item.quantity}</output>
              <button
                type="submit"
                name="quantity"
                value={item.quantity + 1}
                aria-label={fill(messages.line.increase, { name })}
                disabled={item.quantity >= ceiling}
                className="flex h-full w-[30px] items-center justify-center text-[14.4px] leading-[23.76px] disabled:cursor-not-allowed disabled:opacity-30"
              >
                +
              </button>
            </div>

            <button
              type="submit"
              name="quantity"
              value={0}
              aria-label={fill(messages.line.removeLabel, { name })}
              className="flex size-[24px] items-center justify-center"
            >
              <Image src="/icons/trash-outline.svg" alt="" width={24} height={24} />
            </button>
          </form>
        </div>
      </td>

      <td
        className={`w-[72px] py-[20px] text-right sm:w-[100px] ${
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
    <aside aria-labelledby="cart-totals" className="self-start text-[13px] leading-[18.2px] tracking-[-0.076px] text-ink">
      <h2 id="cart-totals" className="pt-2 pb-[10px] font-medium uppercase">
        {messages.totals}
      </h2>

      <details className="group border-t border-line py-[16px]">
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

      <p className="flex justify-between gap-4 border-t border-line py-[16px]">
        <span>{free ? messages.freeShipping : messages.shipping}</span>
        <span className={free ? "font-bold uppercase" : "text-ink-62"}>
          {free ? messages.free : messages.shippingLater}
        </span>
      </p>

      <p className="flex justify-between gap-4 border-t border-line py-[16px] text-[24px] leading-[33.6px] font-medium tracking-[0.07px]">
        <span>{messages.estimatedTotal}</span>
        <span>{formatPrice(cart.grandTotal, currency, locale)}</span>
      </p>

      <div className="pt-[16px]">
        <CheckoutLink
          href={localePath(locale, "/checkout")}
          enabled={cart.itemCount > 0}
          className="flex h-[45px] w-full items-center justify-center rounded-[3px] bg-ink px-[20px] text-[15px] leading-[24.75px] font-medium tracking-[-0.23px] text-paper"
        >
          {messages.checkout}
        </CheckoutLink>
      </div>
    </aside>
  );
}
