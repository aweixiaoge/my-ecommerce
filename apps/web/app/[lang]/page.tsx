import { Suspense } from "react";
import { connection } from "next/server";
import { ContactCta } from "@/components/contact-cta";
import { Hero, HeroFallback } from "@/components/hero";
import {
  Journal,
  JournalFallback,
  JOURNAL_SIZE,
} from "@/components/journal";
import {
  NewArrivals,
  NewArrivalsFallback,
  HOME_GRID_SIZE,
} from "@/components/new-arrivals";
import { TrustBar } from "@/components/trust-bar";
import { WhyBuy } from "@/components/why-buy";
import { listBlogPosts } from "@/lib/blog/blog-repo";
import { getHeroProduct } from "@/lib/catalog/featured-repo";
import { listNewArrivals } from "@/lib/catalog/products-repo";
import { requestDisplayCurrency } from "@/lib/currency/request";
import { getMessages, type Messages } from "@/lib/i18n/messages";
import { requestLocale } from "@/lib/i18n/request";
import type { Locale } from "@/lib/languages";

/**
 * The home page.
 *
 * Three of its sections read the database — the featured product in the hero,
 * the newest products, the newest posts — and each of them has its own
 * `<Suspense>` boundary. That is the shape Cache Components asks for (a
 * request-time read has to happen inside one), and it is also the better one
 * here: a slow read in the journal cannot hold up the grid above it. The
 * sections between them are static and ship immediately.
 *
 * The locale is read here rather than passed down from the layout, which is
 * what the root segment is for: a page under `app/[lang]` is rendered per
 * language, so the section that reads products asks for them in the language of
 * the URL rather than in the layout's language — the two are the same value,
 * but only one of them is available where the query is.
 *
 * Every loader still calls `await connection()` first, and it is not
 * decoration. The page reads no `searchParams` — the one thing that would tell
 * Next the route is request-time — so without that marker each section is
 * prerendered and baked into the build: the page would show whatever was
 * featured, newest and written at build time, for as long as the build lived.
 */
export default async function HomePage() {
  const locale = await requestLocale();
  const messages = getMessages(locale);

  return (
    <>
      <Suspense fallback={<HeroFallback />}>
        <HeroSection locale={locale} messages={messages.hero} />
      </Suspense>

      <TrustBar messages={messages.trustBar} locale={locale} />

      <Suspense fallback={<NewArrivalsFallback />}>
        <ArrivalsSection locale={locale} messages={messages.arrivals} />
      </Suspense>

      <WhyBuy messages={messages.whyBuy} locale={locale} />

      {/* The journal sits where it has always sat: last, over the footer's
          call to action. */}
      <Suspense fallback={<JournalFallback />}>
        <JournalSection locale={locale} messages={messages.journal} />
      </Suspense>

      <ContactCta messages={messages.contact} locale={locale} />
    </>
  );
}

/** The featured product, then the hero. Null draws the page's own copy. */
async function HeroSection({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages["hero"];
}) {
  await connection();

  return (
    <Hero
      product={await getHeroProduct(locale)}
      messages={messages}
      locale={locale}
    />
  );
}

/** The newest products the shop is selling, on the design's two rows of four. */
async function ArrivalsSection({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages["arrivals"];
}) {
  await connection();

  return (
    <NewArrivals
      products={await listNewArrivals(HOME_GRID_SIZE, locale)}
      messages={messages}
      locale={locale}
      // The reader's currency, read here rather than in the card: this section
      // is already a request-time read, so the cookie costs the static shell
      // nothing that the query above it has not already given away.
      currency={await requestDisplayCurrency()}
    />
  );
}

/** The newest posts, on the design's row of three. */
async function JournalSection({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages["journal"];
}) {
  await connection();

  return (
    <Journal
      posts={await listBlogPosts(JOURNAL_SIZE, locale)}
      messages={messages}
      locale={locale}
    />
  );
}
