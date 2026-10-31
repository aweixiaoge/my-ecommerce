import Image from "next/image";
import Link from "next/link";
import type { Cart, CartItem } from "@my-ecommerce/shared";
import { updateCartLineAction } from "@/app/[lang]/cart/actions";
import { productPath } from "@/lib/catalog/product-path";
import type { DisplayCurrency } from "@/lib/currency/display";
import { formatPrice } from "@/lib/format";
import { fill } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/languages";
import { CartLink } from "./cart-link";
import { CheckoutLink } from "./checkout-link";

/**
 * The header's cart with the panel that opens from it (Figma 178:3431): the
 * lines, the subtotal, and the way on to the cart and to checkout.
 *
 * It opens on hover and on keyboard focus, in CSS alone — `group-hover` and
 * `group-focus-within` — so it is a Server Component with no JavaScript of its
 * own, and "Remove" is a form posting the same action the cart page's does.
 * Tailwind's `hover` variants only apply where the device can hover, so a
 * phone's tap follows the link to the cart page rather than opening a panel a
 * thumb would then have to dismiss. The panel is not drawn below `bar` at all:
 * there the bar is a wordmark and three icons, and the cart page is one tap.
 *
 * The panel hangs from the bar's bottom edge, as the language and currency
 * menus do — the wrapper is the full 100px of the row, so the pointer never
 * crosses a gap between the cart and the panel and the hover holds.
 */
export function CartMenu({
  cart,
  amount,
  messages,
  locale,
  currency,
}: {
  cart: Cart | null;
  /** The subtotal, already converted and written for the reader. */
  amount: string;
  messages: Pick<Messages, "header" | "cart">;
  locale: Locale;
  currency: DisplayCurrency;
}) {
  const href = localePath(locale, "/cart");
  const items = cart?.items ?? [];
  const count = cart?.itemCount ?? 0;

  return (
    <div className="group relative flex h-full items-center">
      <CartLink
        href={href}
        amount={amount}
        count={count}
        messages={messages.header}
      />

      <div className="invisible absolute top-full right-0 z-50 hidden w-[340px] border border-line border-t-gold/60 bg-paper px-6 py-6 opacity-0 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.18)] transition-opacity duration-300 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 bar:block">
        {items.length === 0 ? (
          <p className="py-2 text-center font-display text-[17px] leading-[26px] text-ink-55 italic">{messages.cart.empty}</p>
        ) : (
          <>
            {/* The design's list is two lines tall; a longer cart scrolls
                inside the panel rather than running off the window. */}
            <ul className="max-h-[300px] overflow-y-auto">
              {items.map((item, index) => (
                <MenuLine
                  key={item.id}
                  item={item}
                  first={index === 0}
                  messages={messages.cart}
                  locale={locale}
                  currency={currency}
                />
              ))}
            </ul>

            {/*
              Ink, not the design's white. The Figma frame sets this row in
              #FFFFFF on the white panel — invisible, and plainly not meant: a
              subtotal nobody can read is not a subtotal.
            */}
            <p className="flex items-baseline justify-between border-t border-line pt-4 text-ink">
              <span className="text-[11px] leading-4 font-medium tracking-[0.18em] text-ink-55 uppercase">
                {messages.cart.menu.subtotal}
              </span>
              <span className="font-display text-[19px] leading-7 tabular-nums">{amount}</span>
            </p>

            {/* View cart as the outline, Checkout as the solid — the way on
                is the one the panel wants taken. */}
            <div className="grid grid-cols-2 gap-[12px] pt-6">
              <Link
                href={href}
                className="flex h-11 items-center justify-center border border-ink px-[10px] text-[12px] leading-5 font-medium tracking-[0.14em] uppercase transition-colors duration-300 text-ink hover:bg-ink hover:text-paper"
              >
                {messages.cart.menu.view}
              </Link>
              <CheckoutLink
                href={localePath(locale, "/checkout")}
                enabled={count > 0}
                className="flex h-11 items-center justify-center border border-ink px-[10px] text-[12px] leading-5 font-medium tracking-[0.14em] uppercase transition-colors duration-300 bg-ink text-paper hover:bg-paper hover:text-ink"
              >
                {messages.cart.menu.checkout}
              </CheckoutLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * One line: the photograph, "Name - white / M", "2 × $19.00", and the bin.
 *
 * The name carries the options after a dash, as the design writes "Earbud
 * Wireless - Blue" — the panel has no second line for them.
 */
function MenuLine({
  item,
  first,
  messages,
  locale,
  currency,
}: {
  item: CartItem;
  first: boolean;
  messages: Messages["cart"];
  locale: Locale;
  currency: DisplayCurrency;
}) {
  const href = productPath(item.product, locale);
  const options = item.optionValues
    .map((value) => value.name)
    .filter((name) => name !== "")
    .join(" / ");
  const title = options ? `${item.product.name} - ${options}` : item.product.name;

  return (
    <li
      className={`grid grid-cols-[60px_1fr_27px] items-center gap-x-[15px] pb-4 ${
        first ? "" : "border-t border-line pt-4"
      }`}
    >
      <Link
        href={href}
        className="relative block size-[60px] overflow-hidden bg-ivory"
      >
        {item.product.image && (
          <Image
            src={item.product.image.url}
            alt={item.product.image.alt ?? item.product.name}
            fill
            sizes="54px"
            className="object-cover"
          />
        )}
      </Link>

      <div className="min-w-0">
        <Link
          href={href}
          className="block font-display text-[16px] leading-[21px] [overflow-wrap:anywhere] text-ink underline-offset-4 hover:underline"
        >
          {title}
        </Link>
        <p
          className={`pt-1 text-[12px] leading-[18px] tracking-[0.06em] tabular-nums ${
            item.unavailableReason ? "text-ink-55 line-through" : "text-ink-60"
          }`}
        >
          {item.quantity} ×{" "}
          <span className="text-ink">
            {formatPrice(item.variant.price, currency, locale)}
          </span>
        </p>
      </div>

      <form action={updateCartLineAction}>
        <input type="hidden" name="itemId" value={item.id} />
        <button
          type="submit"
          name="quantity"
          value={0}
          aria-label={fill(messages.line.removeLabel, { name: item.product.name })}
          className="flex size-[27px] items-center justify-center opacity-45 transition-opacity duration-300 hover:opacity-100"
        >
          <Image src="/icons/trash.svg" alt="" width={11} height={11} />
        </button>
      </form>
    </li>
  );
}
