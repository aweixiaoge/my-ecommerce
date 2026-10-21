import { prisma, type Prisma } from "@my-ecommerce/db";
import type {
  Media,
  OptionValue,
  Product,
  ProductOption,
  ProductSummary,
  Variant,
} from "@my-ecommerce/shared";
import type { Locale } from "@/lib/languages";
import { productPath } from "./product-path";
import { mediaRef, shopProductSelect, toSummary } from "./product-summary";
import { priceOf } from "./pricing";
import type { RatingLookup } from "./review-rows";
import { getProductRatings } from "./reviews-repo";
import { fallbackLocales, shownTranslation } from "./translation";

/**
 * Reading one product, for its page.
 *
 * The listing's select plus everything a product page adds: the copy, the
 * options a shopper picks between, and the images on each variant. It is
 * written as a spread of the shop's select on purpose — the summary half of
 * this row is then *literally* the same query, so the price on a card and the
 * price on the page it links to cannot drift apart. A product that costs
 * `$87.00 – $333.00` in the grid costs the same at the top of its own page,
 * because it is one mapping and not two.
 *
 * Every translation relation in it selects two locales — the language of the
 * page and the default behind it — because a product page is translated in
 * pieces: a German shop may have the product's name and not its option values,
 * or neither, and none of those states is a reason to render a blank.
 */
export function productDetailSelect(locale: Locale) {
  return {
    ...shopProductSelect(locale),
    translations: {
      where: { locale: { in: fallbackLocales(locale) } },
      select: {
        locale: true,
        name: true,
        slug: true,
        description: true,
        shortDescription: true,
        metaTitle: true,
        metaDescription: true,
      },
    },
    options: {
      orderBy: { position: "asc" },
      select: {
        id: true,
        position: true,
        translations: {
          where: { locale: { in: fallbackLocales(locale) } },
          select: { name: true, locale: true },
        },
        values: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            translations: {
              where: { locale: { in: fallbackLocales(locale) } },
              select: { name: true, locale: true },
            },
          },
        },
      },
    },
    variants: {
      orderBy: { id: "asc" },
      select: {
        id: true,
        sku: true,
        priceAmount: true,
        priceCurrency: true,
        stock: true,
        // Which values select this variant, so the picker can tell which pill a
        // shopper is actually choosing.
        optionValues: {
          select: {
            optionValue: {
              select: {
                id: true,
                translations: {
                  where: { locale: { in: fallbackLocales(locale) } },
                  select: { name: true, locale: true },
                },
              },
            },
          },
        },
        // The images that belong to this variant — the gallery follows the
        // selection.
        media: {
          orderBy: [{ position: "asc" }, { id: "asc" }],
          select: { id: true, position: true },
        },
      },
    },
  } as const satisfies Prisma.ProductSelect;
}

type ProductRow = Prisma.ProductGetPayload<{
  select: ReturnType<typeof productDetailSelect>;
}>;

/**
 * What a product page needs, which is more than the product.
 *
 * `imagesByVariant` exists because the published `Variant` does not carry one:
 * `VariantSchema` has id, sku, price, stock and option values, and no images.
 * The database attaches images to variants, the design's gallery follows the
 * selected one, and the map is how that reaches the page without widening the
 * shared contract as a side effect of building a screen.
 *
 * A plain object rather than a `Map` because it crosses the server/client
 * boundary, and `Map` is not serializable across it.
 */
export interface ProductDetail {
  product: Product;
  /** Keyed by variant id. A variant with no images of its own is absent. */
  imagesByVariant: Record<string, Media[]>;
}

/**
 * One product by its public URL, or null when there is nothing at that address.
 *
 * Null covers three states, and the page turns all of them into the same 404:
 * no such slug, a slug whose product is not `active`, and a product with no
 * price on any variant. The first two are obvious. The third is the rule the
 * shop listing already applies — a product that cannot render a price is not in
 * the grid — and it would be strange for the grid to hide a product while its
 * URL still answered, so the page hides it too.
 *
 * The lookup goes through the translation table, because the slug lives there
 * (plan.md's decision 2: German pages get German URLs) and is unique within a
 * locale rather than globally.
 */
export async function getProductBySlug(
  slug: string,
  locale: Locale,
): Promise<ProductDetail | null> {
  const row = await prisma.product.findFirst({
    where: {
      status: "active",
      // Either language's slug addresses the product. German pages link to the
      // German slug once there is one, but a product nobody has translated is
      // still reachable — its English slug is the only one it has, and a shop
      // whose German section 404s every product is not a translation, it is a
      // broken site.
      translations: {
        some: { slug, locale: { in: fallbackLocales(locale) } },
      },
    },
    select: productDetailSelect(locale),
  });

  if (!row) return null;

  // One aggregate for one product. A `React.cache`d caller makes this once per
  // request rather than once per read — `generateMetadata` and the page ask for
  // the same product, and `loadProduct` is what keeps that one call.
  const ratings = await getProductRatings([row.id]);

  return toDetail(row, ratings, locale);
}

/**
 * Where a product addressed by *another language's* slug lives in this one — or
 * null when no product has that slug in any language.
 *
 * This is what a link between two languages needs. The language switcher swaps
 * the locale segment and nothing else, so `/fr` following `/de` arrives holding
 * a German slug — `getProductBySlug` above looks in French and English, finds
 * neither, and the shopper got a 404 for pressing "Français". A slug is the
 * product's name *in* a language, so every language's name for it is a way of
 * asking for it; the answer is the address it has here, which the page's
 * `canonicalRedirect` then enforces like any other non-canonical URL.
 *
 * A second query rather than a wider first one, deliberately: the lookup above
 * prefers a row in the page's language or English, and a query that also
 * matched German rows could hand a French URL the product a *German* slug
 * belongs to when two languages spell a slug the same way. Here, where the
 * fallback set has already been asked and said no, a cross-language collision
 * is broken by the newest row first and then by id — deterministic, so the same
 * URL answers the same way twice.
 */
export async function foreignProductPath(
  slug: string,
  locale: Locale,
): Promise<string | null> {
  const row = await prisma.product.findFirst({
    where: { status: "active", translations: { some: { slug } } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: shopProductSelect(locale),
  });
  if (!row) return null;

  // No ratings: this answers with an address, and a card's stars are an
  // aggregate over another table that nothing here draws. `toSummary` still
  // applies the price rules, so a product no page would render has no address
  // to be sent to either — the same rows the lookup above drops.
  const summary = toSummary(row, new Map(), locale);

  return summary ? productPath(summary, locale) : null;
}

/**
 * The row as a product page sees it — the card's summary, plus the rest.
 *
 * `toSummary` does the first half, which is the point: the price, the image,
 * the category and the stock line are decided once, in the module the shop grid
 * also uses.
 */
function toDetail(
  row: ProductRow,
  ratings: RatingLookup,
  locale: Locale,
): ProductDetail | null {
  const translation = shownTranslation(row.translations, locale);
  // Reachable despite the query's `some` filter: that filters *which products*
  // come back, not which translations, so a row whose translations were both
  // deleted still arrives with an empty array.
  if (!translation) return null;

  const summary = toSummary(row, ratings, locale);
  // Reached when nothing on the product is priced, or when its prices are in
  // two currencies — `toSummary` owns both rules.
  if (!summary) return null;

  return {
    product: {
      ...summary,
      description: translation.description,
      // Null rather than an empty string: the contract distinguishes a product
      // with no blurb from one whose blurb is blank, and the page renders
      // nothing for the first.
      shortDescription: translation.shortDescription || null,
      images: row.media.map(mediaRef),
      options: row.options.map((option) => toOption(option, locale)),
      variants: row.variants.flatMap((variant) => toVariant(variant, locale)),
      metaTitle: translation.metaTitle,
      metaDescription: translation.metaDescription,
    },
    imagesByVariant: Object.fromEntries(
      row.variants.map((variant) => [variant.id, variant.media.map(mediaRef)]),
    ),
  };
}

/** One option, as the picker reads it. */
function toOption(
  option: ProductRow["options"][number],
  locale: Locale,
): ProductOption {
  return {
    id: option.id,
    // A row with no name in either language is not something this app writes —
    // the form always names an option — so the empty string is for a
    // hand-inserted row, and an unnamed pill beats a crash.
    name: shownTranslation(option.translations, locale)?.name ?? "",
    position: option.position,
    values: option.values.map(
      (value): OptionValue => ({
        id: value.id,
        name: shownTranslation(value.translations, locale)?.name ?? "",
      }),
    ),
  };
}

/**
 * A variant a shopper can actually buy, or nothing.
 *
 * `VariantSchema` requires both a SKU and a price, while both columns are
 * nullable in the database — the admin form creates drafts, and a colour added
 * a minute ago has no SKU and nobody to decide its price yet. A variant missing
 * either is left out rather than filled in with a placeholder, which is why the
 * picker has to treat "this combination selects no variant" as an ordinary
 * answer rather than an error.
 *
 * Nothing writes a half-priced variant today, so this is a guard against a row
 * that got in another way.
 */
function toVariant(
  variant: ProductRow["variants"][number],
  locale: Locale,
): Variant[] {
  const [price] = priceOf(variant);
  // No price, no SKU, or no name for the value that selects it — respectively
  // not sellable, not identifiable, and not selectable.
  if (!price || variant.sku === null) return [];

  return [
    {
      id: variant.id,
      sku: variant.sku,
      price,
      // No column for it — see `toSummary`.
      compareAtPrice: null,
      stock: variant.stock,
      inStock: variant.stock > 0,
      optionValues: variant.optionValues.map((link) => ({
        id: link.optionValue.id,
        name: shownTranslation(link.optionValue.translations, locale)?.name ?? "",
      })),
    },
  ];
}

/**
 * Other products in the same categories, for the foot of the page.
 *
 * "Related" is the categories the product is already filed in — the only
 * relation the catalogue has. A product in two categories shows the products of
 * both, newest first, and never itself.
 *
 * No categories means no related row rather than a query for everything: the
 * honest answer to "what is like this product" when nobody has said what it is
 * is nothing.
 */
export async function listRelatedProducts(
  input: {
    productId: string;
    categoryIds: readonly string[];
    limit: number;
  },
  locale: Locale,
): Promise<ProductSummary[]> {
  if (input.categoryIds.length === 0) return [];

  const rows = await prisma.product.findMany({
    where: {
      status: "active",
      id: { not: input.productId },
      categories: { some: { categoryId: { in: [...input.categoryIds] } } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: input.limit,
    select: shopProductSelect(locale),
  });

  // The same aggregate the shop listing runs, asked about the four products
  // this row drew rather than the whole catalogue.
  const ratings = await getProductRatings(rows.map((row) => row.id));

  return rows
    .map((row) => toSummary(row, ratings, locale))
    .filter((summary): summary is ProductSummary => summary !== null);
}
