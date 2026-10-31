import type { ProductSummary } from "@my-ecommerce/shared";
import { ProductCard } from "@/components/product-card";
import { EditorialHeading } from "@/components/section-heading";
import type { DisplayCurrency } from "@/lib/currency/display";
import type { Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/languages";

/**
 * The home design's grid is two rows of four, and stays two rows of four —
 * it is a window onto the catalogue, not the catalogue. Everything beyond it
 * is what the Shop page's grid and pager exist for.
 *
 * Exported because the read that fills it needs the same number: the page asks
 * the database for exactly this many products.
 */
export const HOME_GRID_SIZE = 8;

/**
 * The newest products the shop is selling.
 *
 * Synchronous and handed its products, which is what makes it testable — the
 * read and its `<Suspense>` boundary live in the page above.
 */
export function NewArrivals({
  products,
  messages,
  locale,
  currency,
}: {
  products: readonly ProductSummary[];
  /** This locale's `arrivals` slice of the catalog. */
  messages: Messages["arrivals"];
  locale: Locale;
  /** The currency the cards write their prices in. */
  currency: DisplayCurrency;
}) {
  // Nothing to show, no section: a heading over an empty grid is a promise the
  // page cannot keep, and the shop's own page is where "there is nothing here"
  // is worth saying out loud.
  if (products.length === 0) return null;

  return (
    <section className="pt-[96px] pb-[96px]">
      <div className="container-content">
        <EditorialHeading
          title={messages.title}
          linkLabel={messages.link}
          linkHref={localePath(locale, "/shop")}
        />

        <div className="mt-12 grid grid-cols-1 gap-x-[30px] gap-y-[48px] sm:grid-cols-2 bar:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              currency={currency}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * What stands in while the newest products are being read.
 *
 * The section's own shape — heading row and two rows of four cards — so the
 * journal below it does not jump when the real grid lands.
 */
export function NewArrivalsFallback() {
  return (
    <section aria-hidden className="pt-[96px] pb-[96px]">
      <div className="container-content animate-pulse">
        <div className="mx-auto h-[108px] w-[260px] bg-mist" />

        <div className="mt-12 grid grid-cols-1 gap-x-[30px] gap-y-[48px] sm:grid-cols-2 bar:grid-cols-4">
          {Array.from({ length: HOME_GRID_SIZE }, (_, index) => (
            <div key={index} className="aspect-[4/3] bg-mist" />
          ))}
        </div>
      </div>
    </section>
  );
}
