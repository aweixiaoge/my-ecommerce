import type { Prisma } from "@my-ecommerce/db";
import type { Media, ProductSummary } from "@my-ecommerce/shared";
import type { Locale } from "@/lib/languages";
import { productPath } from "./product-path";
import { shopProductSelect } from "./product-summary";
import { fallbackLocales, shownTranslation } from "./translation";

/**
 * What the home page's hero draws, and how a featured row becomes it.
 *
 * The same split as `product-summary.ts`: the decisions about what the data
 * means live in a module with no database in it, and the query lives in the
 * repository that calls this.
 */

/**
 * The listing's columns, plus the one line of copy a card has no room for.
 *
 * Deliberately the shop's own select rather than a narrower one of its own: the
 * hero is a shop card with a bigger type size, and the rules that decide
 * whether a product can be shown at all — a name in either language, a priced
 * variant — are `toSummary`'s, which reads exactly these columns.
 */
export function featuredSelect(locale: Locale) {
  return {
    ...shopProductSelect(locale),
    translations: {
      where: { locale: { in: fallbackLocales(locale) } },
      select: { name: true, slug: true, shortDescription: true, locale: true },
    },
  } as const satisfies Prisma.ProductSelect;
}

/** A row as that select returns it. */
export type FeaturedRow = Prisma.ProductGetPayload<{
  select: ReturnType<typeof featuredSelect>;
}>;

/**
 * The four things the hero renders, and no more.
 *
 * Narrower than the summary it is built from on purpose: the hero shows a name,
 * a sentence, a picture and a link, and handing it a whole `ProductSummary`
 * would be handing it a price, a stock flag and a rating it does not draw —
 * each of which is a decision somebody would eventually make here instead of on
 * the card.
 *
 * `href` rather than a slug, because the address a product lives at is
 * `productPath`'s decision and this is the one place the hero could otherwise
 * spell it out again.
 */
export interface HeroProduct {
  id: string;
  name: string;
  /** Null when nobody has written one — the hero then draws no paragraph. */
  shortDescription: string | null;
  image: Media | null;
  href: string;
}

/**
 * The featured row as the hero's product.
 *
 * `summary` is not optional, and that is the contract: the caller has already
 * asked `toSummary` whether this row is a product the shop can show, and only
 * rows that survive reach here. A row the shop cannot render has no hero.
 *
 * The blurb is `||`, not `??`, for the reason `product-repo` gives about the
 * same column: a blurb written as an empty string is not a sentence, and a
 * paragraph promising nothing is worse than no paragraph.
 */
export function toHeroProduct(
  row: FeaturedRow,
  summary: ProductSummary,
  locale: Locale,
): HeroProduct {
  return {
    id: summary.id,
    name: summary.name,
    shortDescription:
      shownTranslation(row.translations, locale)?.shortDescription || null,
    image: summary.image,
    href: productPath(summary, locale),
  };
}
