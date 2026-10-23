import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CartView } from "@/components/cart/cart-view";
import { requestCart } from "@/lib/cart/request";
import { requestDisplayCurrency } from "@/lib/currency/request";
import { getMessages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import { requestLocale } from "@/lib/i18n/request";
import type { Locale } from "@/lib/languages";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: getMessages(await requestLocale()).cart.title,
    // One shopper's cart is nothing a search engine should list — every
    // crawler would index the same empty page in five languages.
    robots: { index: false },
  };
}

/**
 * The cart.
 *
 * The heading is the static shell and the contents stream: the cart is behind
 * a cookie, and with Cache Components a cookie read outside a `<Suspense>`
 * boundary is a route that cannot be prerendered. The shop page splits its
 * banner from its results the same way.
 */
export default async function CartPage() {
  const locale = await requestLocale();
  const messages = getMessages(locale).cart;

  return (
    <div className="container-content pt-[60px] pb-[60px]">
      <h1 className="text-[30px] leading-[45px] font-bold tracking-[0.396px] text-ink">
        {messages.heading}
      </h1>

      <Suspense fallback={<CartFallback />}>
        <CartContents locale={locale} />
      </Suspense>
    </div>
  );
}

async function CartContents({ locale }: { locale: Locale }) {
  const messages = getMessages(locale).cart;
  const [cart, currency] = await Promise.all([
    requestCart(locale),
    requestDisplayCurrency(),
  ]);

  // No cart and an emptied one are the same page: nothing to buy yet.
  if (!cart || cart.items.length === 0) {
    return (
      <div className="mt-[30px] rounded-[3px] border border-dashed border-line px-6 py-16 text-center">
        <p className="text-[15px] leading-[24.75px] text-ink-62">{messages.empty}</p>
        <Link
          href={localePath(locale, "/shop")}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-[3px] bg-ink px-5 text-[15px] leading-[24.75px] font-medium tracking-[-0.2344px] text-paper"
        >
          {messages.continue}
        </Link>
      </div>
    );
  }

  return <CartView cart={cart} messages={messages} locale={locale} currency={currency} />;
}

/**
 * The header row, two lines and the totals column, at the design's sizes
 * (Figma 178:4433), so the footer does not jump when they land.
 */
function CartFallback() {
  return (
    <div
      aria-hidden
      className="grid animate-pulse grid-cols-1 gap-[48px] pt-[40px] lg:grid-cols-[1fr_360px]"
    >
      <div className="flex flex-col gap-px">
        <div className="h-[38px]" />
        <div className="h-[149px] bg-mist" />
        <div className="h-[149px] bg-mist" />
      </div>
      <div className="h-[292px] bg-mist" />
    </div>
  );
}
