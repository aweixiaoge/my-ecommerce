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

      <div className="invisible absolute top-full right-0 z-50 hidden w-[310px] rounded-[2px] bg-paper px-[20px] py-[22px] opacity-0 shadow-[0_10px_20px_rgba(41,51,61,0.1)] transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 bar:block">
        {items.length === 0 ? (
          <p className="text-[13px] leading-[21.45px] text-ink-62">{messages.cart.empty}</p>
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
            <p className="flex justify-between pt-[15px] text-[13px] leading-[21.45px] font-bold tracking-[-0.076px] text-ink">
              <span>{messages.cart.menu.subtotal}</span>
              <span>{amount}</span>
            </p>

            <div className="grid grid-cols-2 gap-[15px] pt-[30px]">
              <Link
                href={href}
                className="flex h-[45px] items-center justify-center rounded-[3px] bg-ink px-[10px] text-[13px] leading-[21.45px] font-semibold tracking-[-0.076px] text-paper uppercase"
              >
                {messages.cart.menu.view}
              </Link>
              <CheckoutLink
                href={localePath(locale, "/checkout")}
                enabled={count > 0}
                className="flex h-[45px] items-center justify-center rounded-[3px] bg-ink px-[10px] text-[13px] leading-[21.45px] font-semibold tracking-[-0.076px] text-paper uppercase"
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
      className={`grid grid-cols-[54px_1fr_27px] items-center gap-x-[15px] pb-[15px] ${
        first ? "" : "pt-[15px]"
      }`}
    >
      <Link
        href={href}
        className="relative block size-[54px] overflow-hidden rounded-[3px] bg-mist"
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
          className="block text-[15px] leading-[19.5px] font-medium tracking-[-0.23px] text-ink"
        >
          {title}
        </Link>
        <p
          className={`text-[13px] leading-[21.45px] tracking-[-0.076px] ${
            item.unavailableReason ? "text-ink-55 line-through" : "text-ink"
          }`}
        >
          {item.quantity} ×{" "}
          <span className="font-medium">
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
          className="flex size-[27px] items-center justify-center"
        >
          <Image src="/icons/trash.svg" alt="" width={11} height={11} />
        </button>
      </form>
    </li>
  );
}
