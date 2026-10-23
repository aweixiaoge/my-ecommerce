import type { Prisma } from "@my-ecommerce/db";
import {
  addMoney,
  multiplyMoney,
  type Cart,
  type CartItem,
  type CartLineIssue,
  type Money,
} from "@my-ecommerce/shared";
import { priceOf } from "@/lib/catalog/pricing";
import { categoryRef, mediaRef, shopProductSelect } from "@/lib/catalog/product-summary";
import { fallbackLocales, shownTranslation } from "@/lib/catalog/translation";
import { SHOP_CURRENCY } from "@/lib/currency/display";
import type { Locale } from "@/lib/languages";

/**
 * What a cart row is, and how it becomes the contract's `Cart`.
 *
 * The split `lib/catalog/product-summary.ts` uses: the decisions about what the
 * data means live here with no database in them, and the query lives in
 * `./cart-repo.ts`. That is also what lets the price rules be tested, since the
 * unit lane has no Postgres.
 *
 * Every figure is computed here, from the variant as it is *now* — plan.md's
 * "recomputed from the variant on every read". Nothing about a price is stored
 * on a cart line, so there is nothing stale to reconcile.
 */

/**
 * The columns a cart is drawn from.
 *
 * The product half borrows the shop card's own pieces — its translations, its
 * first image, its categories — so a line in the cart names a product exactly
 * the way the card it was added from does, and links to the same address.
 */
export function cartSelect(locale: Locale) {
  const shop = shopProductSelect(locale);

  return {
    id: true,
    items: {
      // The order things went in. The id breaks ties, for the reason every
      // ordered read here gives: two lines written in one millisecond must not
      // swap places between two renders.
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        quantity: true,
        // The size, when the product offers one — see `CartItem` in the schema.
        optionValue: { select: optionValueSelect(locale) },
        variant: {
          select: {
            id: true,
            sku: true,
            priceAmount: true,
            priceCurrency: true,
            stock: true,
            optionValues: {
              orderBy: { optionValue: { option: { position: "asc" } } },
              select: { optionValue: { select: optionValueSelect(locale) } },
            },
            // The variant's own photograph first — a line for the sand colour
            // should show sand — and the product's when it has none.
            media: { ...shop.media, take: 1 },
            product: {
              select: {
                id: true,
                status: true,
                translations: shop.translations,
                media: { ...shop.media, take: 1 },
                categories: shop.categories,
              },
            },
          },
        },
      },
    },
  } as const satisfies Prisma.CartSelect;
}

/**
 * An option value as a line names it: its option's name, for "Color: Blue",
 * and its option's position, so a line lists Colour and Size in the order the
 * product page does.
 */
function optionValueSelect(locale: Locale) {
  return {
    id: true,
    option: {
      select: {
        position: true,
        translations: {
          where: { locale: { in: fallbackLocales(locale) } },
          select: { name: true, locale: true },
        },
      },
    },
    translations: {
      where: { locale: { in: fallbackLocales(locale) } },
      select: { name: true, locale: true },
    },
  } as const satisfies Prisma.ProductOptionValueSelect;
}

export type CartRow = Prisma.CartGetPayload<{
  select: ReturnType<typeof cartSelect>;
}>;

type ItemRow = CartRow["items"][number];

/** Nothing, in the shop's currency — an empty cart's every total. */
const ZERO: Money = { amount: "0", currency: SHOP_CURRENCY };

/**
 * The row as the cart page and the header read it.
 *
 * The totals count only the lines that can be bought as they stand. A line
 * with an issue is still shown — the shopper put it there and deserves to see
 * what happened to it — but it is not money they are about to spend, and a
 * subtotal that included it would be a figure checkout could not honour.
 */
export function toCart(row: CartRow, locale: Locale): Cart {
  const items = row.items.flatMap((item) => toItem(item, locale));
  const buyable = items.filter((item) => item.unavailableReason === null);

  const subtotal = buyable.reduce((sum, item) => addMoney(sum, item.lineTotal), ZERO);

  return {
    id: row.id,
    currency: SHOP_CURRENCY,
    items,
    itemCount: buyable.reduce((count, item) => count + item.quantity, 0),
    subtotal,
    // No coupons yet (Phase 5), and no address to ship to or tax against.
    discountTotal: ZERO,
    shippingTotal: null,
    taxTotal: null,
    grandTotal: subtotal,
  };
}

/**
 * One line, or nothing when there is no honest line to draw.
 *
 * Nothing covers two states. A product with no name in either language has
 * nothing to call the line — the shop drops the same row for the same reason.
 * A variant with no price or no SKU cannot be described by `VariantSchema` at
 * all; nothing the storefront offers can be added in that state, so it means a
 * draft edited after the fact, and the line comes back the moment the variant
 * is priced again.
 */
function toItem(item: ItemRow, locale: Locale): CartItem[] {
  const { variant } = item;
  const { product } = variant;

  const translation = shownTranslation(product.translations, locale);
  if (!translation) return [];

  const [price] = priceOf(variant);
  if (!price || variant.sku === null) return [];

  const image = variant.media.at(0) ?? product.media.at(0);

  const variantValues = variant.optionValues.map((link) => link.optionValue);
  // The variant's values and the size together, ordered by their options'
  // positions — a stable sort, so equal positions keep the variant's order.
  const chosen = [...variantValues, ...(item.optionValue ? [item.optionValue] : [])].sort(
    (a, b) => a.option.position - b.option.position,
  );
  const named = (value: (typeof chosen)[number]) => ({
    id: value.id,
    name: shownTranslation(value.translations, locale)?.name ?? "",
  });
  const labelled = (value: (typeof chosen)[number]) => ({
    ...named(value),
    option: shownTranslation(value.option.translations, locale)?.name ?? "",
  });

  return [
    {
      id: item.id,
      quantity: item.quantity,
      variant: {
        id: variant.id,
        sku: variant.sku,
        price,
        compareAtPrice: null,
        stock: variant.stock,
        inStock: variant.stock > 0,
        optionValues: variantValues.map(named),
      },
      optionValues: chosen.map(labelled),
      product: {
        id: product.id,
        slug: translation.slug,
        name: translation.name,
        image: image ? mediaRef(image) : null,
        categories: product.categories.flatMap((link) => categoryRef(link, locale)),
      },
      lineTotal: multiplyMoney(price, item.quantity),
      unavailableReason: issueOf(item, product.status, price),
    },
  ];
}

/**
 * What stands between a line and checkout, if anything.
 *
 * A price in another currency than the shop's is `withdrawn` rather than
 * summed: the admin writes every price in the shop's currency, so such a row
 * was inserted by hand, and `addMoney` refuses to add two currencies for the
 * reason `compareMoney` refuses to order them.
 */
function issueOf(
  item: ItemRow,
  status: ItemRow["variant"]["product"]["status"],
  price: Money,
): CartLineIssue | null {
  if (status !== "active" || price.currency !== SHOP_CURRENCY) return "withdrawn";
  if (item.variant.stock <= 0) return "outOfStock";
  if (item.quantity > item.variant.stock) return "limitedStock";

  return null;
}
