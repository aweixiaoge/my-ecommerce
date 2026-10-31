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
    <div className="container-content pt-[72px] pb-[96px]">
      <div className="text-center">
        <h1 className="font-display text-[40px] leading-[48px] font-normal text-ink sm:text-[48px] sm:leading-[56px]">
          {messages.heading}
        </h1>
        <div aria-hidden className="mx-auto mt-5 h-px w-8 bg-gold/50" />
      </div>

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
      <div className="mt-[48px] border border-line bg-ivory px-6 py-16 text-center">
        <p className="font-display text-[20px] leading-8 text-ink-62 italic">{messages.empty}</p>
        <Link
          href={localePath(locale, "/shop")}
          className="mt-8 inline-flex h-11 items-center justify-center px-7 border border-ink bg-ink text-[13px] leading-5 font-medium tracking-[0.14em] text-paper transition-colors duration-300 hover:bg-paper hover:text-ink"
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
      className="grid animate-pulse grid-cols-1 gap-[56px] pt-[56px] lg:grid-cols-[1fr_380px]"
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
