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
import { listNewArrivals } from "@/lib/catalog/products-repo";
import { getHeroProduct } from "@/lib/catalog/featured-repo";

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
 * Every loader calls `await connection()` first, and it is not decoration. The
 * home page reads no `params` and no `searchParams` — the two things that tell
 * Next a route is request-time — so without that marker each section is
 * prerendered and baked into the build: the page would show whatever was
 * featured, newest and written at build time, for as long as the build lived.
 */
export default function HomePage() {
  return (
    <>
      <Suspense fallback={<HeroFallback />}>
        <HeroSection />
      </Suspense>

      <TrustBar />

      <Suspense fallback={<NewArrivalsFallback />}>
        <ArrivalsSection />
      </Suspense>

      <WhyBuy />

      {/* The journal sits where it has always sat: last, over the footer's
          call to action. */}
      <Suspense fallback={<JournalFallback />}>
        <JournalSection />
      </Suspense>

      <ContactCta />
    </>
  );
}

/** The featured product, then the hero. Null draws the page's own copy. */
async function HeroSection() {
  await connection();

  return <Hero product={await getHeroProduct()} />;
}

/** The newest products the shop is selling, on the design's two rows of four. */
async function ArrivalsSection() {
  await connection();

  return <NewArrivals products={await listNewArrivals(HOME_GRID_SIZE)} />;
}

/** The newest posts, on the design's row of three. */
async function JournalSection() {
  await connection();

  return <Journal posts={await listBlogPosts(JOURNAL_SIZE)} />;
}
