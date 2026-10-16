import { prisma, type Prisma } from "@my-ecommerce/db";
import type {
  Media,
  OptionValue,
  Product,
  ProductOption,
  ProductSummary,
  Variant,
} from "@my-ecommerce/shared";
import { DEFAULT_LOCALE } from "../locale";
import { mediaRef, SHOP_PRODUCT_SELECT, toSummary } from "./product-summary";
import { priceOf } from "./pricing";
import type { RatingLookup } from "./review-rows";
import { getProductRatings } from "./reviews-repo";

/**
 * Reading one product, for its page.
 *
 * The listing's select plus everything a product page adds: the copy, the
 * options a shopper picks between, and the images on each variant. It is
 * written as a spread of `SHOP_PRODUCT_SELECT` on purpose — the summary half of
 * this row is then *literally* the same query, so the price on a card and the
 * price on the page it links to cannot drift apart. A product that costs
 * `$87.00 – $333.00` in the grid costs the same at the top of its own page,
 * because it is one mapping and not two.
 */
const PRODUCT_DETAIL_SELECT = {
  ...SHOP_PRODUCT_SELECT,
  translations: {
    where: { locale: DEFAULT_LOCALE },
    select: {
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
        where: { locale: DEFAULT_LOCALE },
        select: { name: true },
      },
      values: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          translations: {
            where: { locale: DEFAULT_LOCALE },
            select: { name: true },
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
                where: { locale: DEFAULT_LOCALE },
                select: { name: true },
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

type ProductRow = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_DETAIL_SELECT;
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
): Promise<ProductDetail | null> {
  const row = await prisma.product.findFirst({
    where: {
      status: "active",
      translations: { some: { locale: DEFAULT_LOCALE, slug } },
    },
    select: PRODUCT_DETAIL_SELECT,
  });

  if (!row) return null;

  // One aggregate for one product. A `React.cache`d caller makes this once per
  // request rather than once per read — `generateMetadata` and the page ask for
  // the same product, and `loadProduct` is what keeps that one call.
  const ratings = await getProductRatings([row.id]);

  return toDetail(row, ratings);
}

/**
 * The row as a product page sees it — the card's summary, plus the rest.
 *
 * `toSummary` does the first half, which is the point: the price, the image,
 * the category and the stock line are decided once, in the module the shop grid
 * also uses.
 */
function toDetail(row: ProductRow, ratings: RatingLookup): ProductDetail | null {
  const translation = row.translations.at(0);
  // Reachable despite the query's `some` filter: that filters *which products*
  // come back, not which translations, so a row whose only English translation
  // was deleted still arrives with an empty array.
  if (!translation) return null;

  const summary = toSummary(row, ratings);
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
      options: row.options.map(toOption),
      variants: row.variants.flatMap(toVariant),
      metaTitle: translation.metaTitle,
      metaDescription: translation.metaDescription,
    },
    imagesByVariant: Object.fromEntries(
      row.variants.map((variant) => [variant.id, variant.media.map(mediaRef)]),
    ),
  };
}

/** One option, as the picker reads it. */
function toOption(option: ProductRow["options"][number]): ProductOption {
  return {
    id: option.id,
    // A row with no name in this locale is not something this app writes — the
    // form always names an option — so the fallback is for a hand-inserted row,
    // and an unnamed pill beats a crash.
    name: option.translations.at(0)?.name ?? "",
    position: option.position,
    values: option.values.map(
      (value): OptionValue => ({
        id: value.id,
        name: value.translations.at(0)?.name ?? "",
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
function toVariant(variant: ProductRow["variants"][number]): Variant[] {
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
        name: link.optionValue.translations.at(0)?.name ?? "",
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
export async function listRelatedProducts(input: {
  productId: string;
  categoryIds: readonly string[];
  limit: number;
}): Promise<ProductSummary[]> {
  if (input.categoryIds.length === 0) return [];

  const rows = await prisma.product.findMany({
    where: {
      status: "active",
      id: { not: input.productId },
      categories: { some: { categoryId: { in: [...input.categoryIds] } } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: input.limit,
    select: SHOP_PRODUCT_SELECT,
  });

  // The same aggregate the shop listing runs, asked about the four products
  // this row drew rather than the whole catalogue.
  const ratings = await getProductRatings(rows.map((row) => row.id));

  return rows
    .map((row) => toSummary(row, ratings))
    .filter((summary): summary is ProductSummary => summary !== null);
}
