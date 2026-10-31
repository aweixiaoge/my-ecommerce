import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { addressFormValues, customerAddresses } from "@/lib/account/addresses-repo";
import { requestCustomer } from "@/lib/account/request";
import { requestCart } from "@/lib/cart/request";
import { countryOptions, DEFAULT_COUNTRY, regionsFor } from "@/lib/checkout/countries";
import { requestDisplayCurrency } from "@/lib/currency/request";
import { getMessages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import { requestLocale } from "@/lib/i18n/request";
import type { Locale } from "@/lib/languages";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: getMessages(await requestLocale()).checkout.title,
    // One shopper's checkout is nothing a search engine should list.
    robots: { index: false },
  };
}

/**
 * The checkout (Figma 178:7839).
 *
 * The title is the static shell and the form streams: what is being bought is
 * the cart, which is behind a cookie, and with Cache Components a cookie read
 * outside a `<Suspense>` boundary is a route that cannot be prerendered. The
 * cart page splits the same way.
 *
 * The design sets the title on the storefront's 1290 column and the form on a
 * wider 1550 one — both kept — on the page's own white rather than its #FAFBFC
 * wash, under the centred serif masthead every other storefront page opens with.
 */
export default async function CheckoutPage() {
  const locale = await requestLocale();

  return (
    <div>
      <div className="container-content pt-[72px] text-center">
        <h1 className="font-display text-[40px] leading-[48px] font-normal text-ink sm:text-[48px] sm:leading-[56px]">
          {getMessages(locale).checkout.title}
        </h1>
        <div aria-hidden className="mx-auto mt-5 h-px w-8 bg-gold/50" />
      </div>

      <div className="mx-auto w-full max-w-[1598px] px-6 pt-[32px] pb-[100px]">
        <Suspense fallback={<CheckoutFallback />}>
          <CheckoutContents locale={locale} />
        </Suspense>
      </div>
    </div>
  );
}

async function CheckoutContents({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const [cart, currency, customer] = await Promise.all([
    requestCart(locale),
    requestDisplayCurrency(),
    requestCustomer(),
  ]);
  // A signed-in shopper's address book starts the form: what My account →
  // Addresses says "will be used on the checkout page by default".
  const book = customer ? await customerAddresses(customer.id) : null;

  // Only what can be bought is ordered; a line with an issue stays in the cart.
  const items = cart?.items.filter((item) => item.unavailableReason === null) ?? [];

  if (!cart || items.length === 0) {
    return (
      <div className="mt-[24px] border border-line bg-ivory px-6 py-16 text-center">
        <p className="font-display text-[20px] leading-8 text-ink-62 italic">{messages.checkout.empty}</p>
        <Link
          href={localePath(locale, "/shop")}
          className="mt-8 inline-flex h-11 items-center justify-center px-7 border border-ink bg-ink text-[13px] leading-5 font-medium tracking-[0.14em] text-paper transition-colors duration-300 hover:bg-paper hover:text-ink"
        >
          {messages.cart.continue}
        </Link>
      </div>
    );
  }

  return (
    <CheckoutForm
      locale={locale}
      // One per drawing of the form: every submission of this page carries it,
      // so a double-click places one order (see `placeOrder`).
      idempotencyKey={randomUUID()}
      countries={countryOptions(locale).map((country) => ({
        ...country,
        regions: regionsFor(country.code),
      }))}
      defaultCountry={DEFAULT_COUNTRY}
      items={items}
      subtotal={cart.subtotal}
      hasUnavailable={items.length < cart.items.length}
      currency={currency}
      messages={messages.checkout}
      cartMessages={{
        coupons: messages.cart.coupons,
        optionLabel: messages.cart.optionLabel,
      }}
      cartHref={localePath(locale, "/cart")}
      initialEmail={customer?.email}
      saved={
        book
          ? {
              shipping: book.shipping && addressFormValues(book.shipping),
              billing: book.billing && addressFormValues(book.billing),
            }
          : undefined
      }
    />
  );
}

/** The form column and the summary, at the design's sizes, while the cart is read. */
function CheckoutFallback() {
  return (
    <div
      aria-hidden
      className="grid animate-pulse grid-cols-1 gap-[56px] pt-[24px] lg:grid-cols-[1fr_400px]"
    >
      <div className="flex flex-col gap-[24px]">
        <div className="h-[94px] bg-mist" />
        <div className="h-[408px] bg-mist" />
      </div>
      <div className="order-first h-[441px] bg-mist lg:order-none" />
    </div>
  );
}
