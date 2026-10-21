import { Suspense } from "react";
import type { Metadata } from "next";
import "../globals.css";
import {
  CurrencySwitcher,
  CurrencyTrigger,
  type Placement,
} from "@/components/currency-switcher";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SHOP_CURRENCY } from "@/lib/currency/display";
import { requestDisplayCurrency } from "@/lib/currency/request";
import { getMessages, type Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import { requestLocale } from "@/lib/i18n/request";
import { LOCALES } from "@/lib/languages";
import { NAV } from "@/lib/nav";

/**
 * The site's own title and description, in the language of the address.
 *
 * `generateMetadata` rather than a constant, because the description is copy:
 * the German home page describes itself in German. The title template is not —
 * a brand name is not translated — but it has to be repeated here all the same,
 * because metadata does not cross a root boundary and the admin root declares
 * its own.
 */
export async function generateMetadata(): Promise<Metadata> {
  const messages = getMessages(await requestLocale());

  return {
    title: {
      default: messages.header.brand,
      template: `%s · ${messages.header.brand}`,
    },
    description: messages.meta.description,
  };
}

/**
 * The storefront's root layout — the document, and the chrome around every
 * page.
 *
 * It is the *root* layout, not a nested one, and that is what puts the
 * language above it: `[lang]` is the first path segment, so `/de/shop` renders
 * German and `/en/shop` English from this one file, and `<html lang>` can be
 * the real language rather than a guess. `app/admin` has a root layout of its
 * own and none of this applies to it — the header and footer live here
 * precisely because no storefront layout is above the admin any more, which is
 * the opposite of the arrangement that used to hold the chrome back.
 *
 * The locale arrives two ways on purpose. `generateStaticParams` below hands
 * the build every language so each one gets its own prerendered shell, and the
 * `lang()` getter reads the segment the request actually carries. A request
 * for a segment that is not a language — which the proxy should have redirected
 * before it got here — 404s rather than rendering a page with no catalog
 * behind it.
 */
export default async function StorefrontLayout({
  children,
}: LayoutProps<"/[lang]">) {
  const locale = await requestLocale();
  const messages = getMessages(locale);

  /*
   * The seven routes, resolved once for both the header and the footer: the
   * label from this locale's catalog, and the address through `localePath` so
   * the links hold the language the page is being read in. The footer is a
   * Server Component and could look both up itself; it is handed them instead
   * so the two lists cannot disagree.
   */
  const nav = NAV.map((item) => ({
    label: messages.nav[item.key],
    href: localePath(locale, item.href),
    prefetch: item.prefetch,
  }));

  /*
   * The header's currency control, in either of the two seats it takes.
   *
   * It is built here rather than inside the header because of one constraint
   * and one boundary. The constraint: which currency prices are written in
   * comes from a cookie (`lib/currency/request.ts`), and with Cache Components
   * a cookie read has to happen inside a `<Suspense>` boundary or the route
   * cannot be prerendered at all. The boundary: `site-header.tsx` is a client
   * component, and a client module cannot import the Server Component that
   * does the reading. So the read and its boundary stay on this side, and the
   * header is handed the two already-rendered seats — which is the documented
   * way one crosses that boundary.
   *
   * The fallback is the closed trigger wearing the shop's own currency, at the
   * same size, so the bar does not have a hole in it while the cookie is read.
   */
  const currencyControl = (placement: Placement) => (
    <Suspense
      fallback={
        <CurrencyTrigger currency={SHOP_CURRENCY} placement={placement} />
      }
    >
      <HeaderCurrency placement={placement} messages={messages.header} />
    </Suspense>
  );

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <SiteHeader
          nav={nav}
          messages={messages.header}
          locale={locale}
          navCurrency={currencyControl("nav")}
          barCurrency={currencyControl("bar")}
        />

        <main className="flex-1">{children}</main>

        <SiteFooter nav={nav} messages={messages.footer} locale={locale} />
      </body>
    </html>
  );
}

/**
 * The reader's currency, as the header's control.
 *
 * The one thing in the chrome that is per-reader, and the reason the header's
 * currency seat is a streamed hole rather than part of the shell: the cookie is
 * request-time data, so the control that shows it can only be drawn once the
 * request is in hand. Everything around it — the wordmark, the nav, the cart
 * — is shared by every reader and is prerendered.
 *
 * A module-level component rather than a call inside the layout for the reason
 * every reader in `app/` is: it awaits, and an await at this level would hold
 * the whole segment behind it.
 */
async function HeaderCurrency({
  placement,
  messages,
}: {
  placement: Placement;
  /** This locale's `header` slice — the control names itself from it. */
  messages: Messages["header"];
}) {
  return (
    <CurrencySwitcher
      display={await requestDisplayCurrency()}
      messages={messages}
      placement={placement}
    />
  );
}

/**
 * Every language, prerendered.
 *
 * Required, not an optimisation: with Cache Components enabled a root
 * parameter must have at least one value or the build fails. It reads the one
 * locale list rather than repeating it, so a language added to `LANGUAGES`
 * cannot be left out of the build — the failure that would otherwise be silent,
 * since a param the build does not know is simply rendered on request and never
 * checked.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ lang: locale }));
}
