import Image from "next/image";
import Link from "next/link";
import { plural } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";

/**
 * The header's cart: the amount, the icon, and how many things are in it.
 *
 * Drawn by the layout rather than by `site-header.tsx`, for the reason the
 * currency control is: what is in the cart comes from a cookie, a cookie can
 * only be read on the server, and the header is a client component. The layout
 * reads the cart inside a `<Suspense>` boundary and hands this over already
 * rendered, with an empty-cart copy of it as the fallback — see
 * `app/[lang]/layout.tsx`.
 *
 * No `"use client"`: there is nothing interactive here, and the module is
 * imported only from the server.
 */
export function CartLink({
  href,
  amount,
  count,
  messages,
}: {
  /** The cart page, in this locale. */
  href: string;
  /** The subtotal, already converted and written for the reader. */
  amount: string;
  /** Units in the cart that can be bought — the badge. */
  count: number;
  /** This locale's `header` slice of the catalog. */
  messages: Messages["header"];
}) {
  return (
    <Link
      href={href}
      // The name says what the badge shows, so a screen reader hears "Cart,
      // 2 items" rather than a bare "Cart" over a number it cannot see.
      aria-label={count > 0 ? plural(count, messages.cartCount) : messages.cart}
      className="flex items-center gap-2 pl-2.5"
    >
      {/*
        The amount is the cheapest thing in the row to give up, so it is part
        of what pays for the nav staying in the bar: gone from `bar` to `wide`,
        back above it. Keeping it would put the row 11.23px over what 768
        offers even with the links tightened, and 74.23px over at the design's
        spacing. Below `bar` the cart is icon-only for the older reason too —
        there the wordmark has to hold one line in the 126px it needs, and the
        amount would push "Smart Mall" over two.
      */}
      <span className="hidden text-[13px] font-medium leading-[21.45px] tracking-[0.02em] text-ink tabular-nums wide:inline">
        {amount}
      </span>

      {/*
        The badge hangs off the icon's corner rather than sitting beside it,
        so it costs the row no width — the bar's budget above is already spent
        to the pixel at 768.
      */}
      <span className="relative flex">
        <Image src="/icons/cart.svg" alt="" width={15} height={14} />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute -top-2 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] leading-none font-medium text-paper tabular-nums"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
    </Link>
  );
}
