import type { Prisma } from "@my-ecommerce/db";
import { isVideoType, type CategoryRef, type Media, type ProductSummary } from "@my-ecommerce/shared";
import type { Locale } from "@/lib/languages";
import { publicMediaUrl } from "./media-repo";
import { priceOf, variantPriceSpan } from "./pricing";
import type { RatingLookup } from "./review-rows";
import { fallbackLocales, shownTranslation } from "./translation";

/**
 * What a listing row is, and how it becomes a summary.
 *
 * A module of its own because two reads need the same answer: the shop's
 * listing, and the related-products row on a product page. Both ask the
 * database for the same columns and both turn a row into the same
 * `ProductSummary`, and a second copy of that mapping is a second place for the
 * price rules to be got wrong.
 *
 * The split is the one `lib/admin/` already uses: the decisions about *what the
 * data means* live in a module with no database in it, and the query lives in
 * the repository that calls this.
 *
 * The one thing a summary cannot decide for itself is the rating. It is an
 * aggregate over another table, and a `select` cannot carry one — so it arrives
 * as the second argument, from the same `getProductRatings` the review section
 * on the product page reads. A card's stars and the stars at the top of the
 * page a card links to therefore cannot disagree.
 */

/**
 * The columns a card is made of, and no others.
 *
 * A `select` rather than an `include`, which is not a style preference: an
 * `include` brings every scalar on the relation, and `Media.data` is the image
 * itself — a `bytea` column. Loading it meant reading roughly 19 MB of JPEG out
 * of Postgres on every view of the shop and throwing all of it away, for two
 * products. `description` is the other one worth not fetching: it is the whole
 * product page's markdown, and a card shows none of it.
 */
export function shopProductSelect(locale: Locale) {
  return {
    id: true,
    translations: {
      // Two locales, not one: the language of the page, and the default behind
      // it. `shownTranslation` picks between them, which is what keeps a
      // product without a translation in this language on the shelf rather
      // than out of the grid.
      where: { locale: { in: fallbackLocales(locale) } },
      select: { name: true, slug: true, locale: true },
    },
    variants: {
      // `status` is deliberately not selected, and must not be added as a
      // filter. Every variant in this database is `draft` — `variantCreateData`
      // writes it that way and `setProductStatus` never touches a variant — so a
      // `some: { status: "active" }` would empty the shop in one line.
      select: { priceAmount: true, priceCurrency: true, stock: true },
    },
    media: {
      // Position is the order the admin arranged them in. The id breaks ties
      // rather than leaving them to the database: images of different variants
      // can share a position, and an arbitrary winner would let a card's
      // photograph change between two identical requests.
      orderBy: [{ position: "asc" }, { id: "asc" }],
      // Photographs only. A card, a cart line and an order are drawn with
      // `next/image`, and a product video is for the product page's gallery —
      // so "the first image" skips one even when the admin put it first.
      where: IMAGES_ONLY,
      // No `data`, and no `url` either — the bytes are megabytes and the route
      // that serves them builds its own URL. See `publicMediaUrl`.
      select: { id: true, position: true, mimeType: true },
    },
    categories: {
      // The same tie-break as the images, for the same reason and a worse one:
      // every category the admin's create screen makes is a root at position
      // zero, so position alone leaves the choice of a card's category line to
      // the query plan.
      orderBy: [{ category: { position: "asc" } }, { categoryId: "asc" }],
      select: {
        category: {
          select: {
            id: true,
            translations: {
              where: { locale: { in: fallbackLocales(locale) } },
              select: { name: true, slug: true, locale: true },
            },
          },
        },
      },
    },
  } as const satisfies Prisma.ProductSelect;
}

/**
 * A row as the listing query returns it.
 *
 * Derived from the select rather than hand-written, so that adding a column to
 * the query is a type error below until something has decided what the summary
 * does with it.
 */
export type ShopRow = Prisma.ProductGetPayload<{
  select: ReturnType<typeof shopProductSelect>;
}>;

/**
 * The row as a card sees it, or null when there is no honest card to render.
 *
 * Null is not a symptom of a query that asked for too much. Two states reach
 * it, and neither has a valid `ProductSummary` behind it:
 *
 *   * no translation at all — not in the language of the page, and not in the
 *     default either, so there is no name and no slug: no card, and nowhere
 *     for its link to lead;
 *   * nothing is priced, or the prices are in two currencies — the two states
 *     `variantPriceSpan` describes, and a product page drops the same rows for
 *     the same reasons.
 *
 * Dropping the row is the answer `listProducts` gives in the admin repo to a
 * row it cannot read: a list with a gap in it beats a list that throws.
 *
 * The first state used to be "no translation in the display locale", which is
 * a shorter list than it sounds: until a language's rows are written, *every*
 * product is in it. `shownTranslation` is what makes the difference — the page
 * shows the product's name in the default language rather than hiding a
 * product that is for sale.
 */
export function toSummary(
  row: ShopRow,
  ratings: RatingLookup,
  locale: Locale,
): ProductSummary | null {
  const translation = shownTranslation(row.translations, locale);
  if (!translation) return null;

  const span = variantPriceSpan(row.variants.flatMap(priceOf));
  if (!span) return null;

  // A filter rather than `at(0)`: the product page's read selects the videos
  // too (`productDetailSelect`), and its summary is still a picture.
  const image = row.media.find((media) => !isVideoType(media.mimeType));

  return {
    id: row.id,
    slug: translation.slug,
    name: translation.name,
    price: span.price,
    priceMax: span.priceMax,
    // A column the catalogue does not have yet. Nothing reads it — the card
    // ignores it, and the product page shows no struck-through price.
    compareAtPrice: null,
    image: image ? mediaRef(image) : null,
    inStock: row.variants.some((variant) => variant.stock > 0),
    // The card shows the first one, in the order the admin arranged the tree.
    // Empty is an ordinary state, not a failure: a product nobody has filed
    // yet simply has no line there.
    categories: row.categories.flatMap((link) => categoryRef(link, locale)),
    // Absent from the aggregate when no review of this product has been
    // approved yet — which is not the same as a rating of zero, and is why
    // `StarRating` renders nothing at all for it.
    rating: ratings.get(row.id) ?? null,
  };
}

/**
 * One stored image, as the contract wants it.
 *
 * The URL is built from the id rather than read from the row's `url` column:
 * that column holds `/admin/media/{id}`, which answers 404 to anyone without an
 * admin session — every shopper.
 *
 * `alt`, `width` and `height` have no columns yet (`media_translations` is in
 * plan.md and is not built), and the card falls back to the product's name for
 * alt text.
 */
export function mediaRef(media: {
  id: string;
  position: number;
  /** The stored type, when the read selected it; what decides `kind`. */
  mimeType?: string | null;
}): Media {
  return {
    id: media.id,
    url: publicMediaUrl(media.id),
    alt: null,
    width: null,
    height: null,
    position: media.position,
    kind: isVideoType(media.mimeType) ? "video" : "image",
  };
}

/**
 * Media that is not a video. Untyped rows count as images: rows written before
 * the type column was filled have no type, and every one of those is a
 * photograph — and a bare `NOT startsWith` would drop them, since SQL's answer
 * for NULL is neither.
 */
export const IMAGES_ONLY = {
  OR: [{ mimeType: null }, { NOT: { mimeType: { startsWith: "video/" } } }],
} as const satisfies Prisma.MediaWhereInput;

/**
 * A product's link to a category, as a card reads it — or nothing when the
 * category has no name in this language and none in the default either.
 *
 * Skipped rather than defaulting to a placeholder, and skipped rather than
 * taking the product down with it: a category whose translations have not been
 * written is a gap in a card's category line, not a reason to hide a product
 * that is otherwise perfectly sellable. The card already renders nothing for an
 * empty list, so the two absences look the same, which is what they are.
 *
 * The name and the slug come from the *category's* translation, not the
 * product's: they are two rows that fall back independently, and a card can
 * legitimately carry a Dutch product name over a German category one.
 */
export function categoryRef(
  link: ShopRow["categories"][number],
  locale: Locale,
): CategoryRef[] {
  const translation = shownTranslation(link.category.translations, locale);
  if (!translation) return [];

  return [
    {
      id: link.category.id,
      slug: translation.slug,
      name: translation.name,
    },
  ];
}
