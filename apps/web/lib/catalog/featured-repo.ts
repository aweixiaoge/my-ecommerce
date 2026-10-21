import { prisma } from "@my-ecommerce/db";
import type { Locale } from "@/lib/languages";
import { featuredSelect, toHeroProduct, type HeroProduct } from "./featured-rows";
import { toSummary } from "./product-summary";
import { getProductRatings } from "./reviews-repo";

/**
 * The home page's featured product, as the admin's `/admin/features` screen
 * writes it.
 *
 * The screen writes a *set* — the order things were featured in, which its own
 * repository spells `createdAt` ascending — and the hero shows **the last one**:
 * featuring a product is how somebody says "put this on the home page", so the
 * newest row is the answer, and unfeaturing it surfaces the one before rather
 * than emptying the hero. A row or a grid of the rest is a bigger home page
 * than this one has today.
 *
 * Reading through `toSummary` is the point of the file: a featured product can
 * be a draft, unpriced, or untranslated, and the hero must not show a product
 * the shop refuses to sell or link to a page that 404s. The first row that
 * survives those rules is the hero's product; if none does, there is no hero
 * product and the page keeps the copy it has always had.
 */
export async function getHeroProduct(
  locale: Locale,
): Promise<HeroProduct | null> {
  const rows = await prisma.product.findMany({
    where: {
      // The same filter the shop applies, for the same reason: a draft is not
      // for sale, so it is not on the home page either.
      status: "active",
      // Featured only. The relation is a set with no rows for a product nobody
      // has featured, so its absence is the filter.
      featuredProduct: { isNot: null },
    },
    // Newest first — the last thing featured is what the home page shows —
    // with the id breaking ties rather than the query plan: two products
    // featured in the same millisecond must not swap between two requests.
    // `listFeaturedProductIds` in the admin repo orders the same way.
    orderBy: [{ featuredProduct: { createdAt: "desc" } }, { id: "asc" }],
    select: featuredSelect(locale),
  });

  // Every featured product's rating, in one query, exactly as the listing
  // does — the hero draws no stars today, and a summary whose rating was left
  // out would be a `null` that meant "not asked for" waiting to be rendered as
  // "no reviews".
  const ratings = await getProductRatings(rows.map((row) => row.id));

  for (const row of rows) {
    const summary = toSummary(row, ratings, locale);
    if (summary) return toHeroProduct(row, summary, locale);
  }

  return null;
}
