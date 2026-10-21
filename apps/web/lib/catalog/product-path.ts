import type { CategoryRef } from "@my-ecommerce/shared";
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/languages";

/**
 * Where a product and a category live, as addresses.
 *
 * A module of its own, with no React and no database in it, because these three
 * strings are the whole of the storefront's URL policy and they are read from
 * components in both directions: cards build the address, the product page
 * checks the one it was asked for against it. Written as a template in two
 * components, the rule "a product is under its category" would be two rules the
 * first time one of them changed.
 *
 * Every address carries the language, because the language is part of the
 * address rather than a setting: `/de/products/audio/wireless-earbuds` and
 * `/en/products/audio/wireless-earbuds` are two pages that a crawler can find
 * separately, and the slug inside each is the one that locale's translation
 * carries — which is what makes a German slug take over its own URL the day it
 * is written, with no link anywhere edited.
 */

/**
 * Anything with a slug and the categories it is filed in.
 *
 * Structural rather than `ProductSummary`, because `ProductSummary` carries
 * twenty fields this needs none of — and the pages that render a card already
 * have one.
 */
export interface ProductAddress {
  slug: string;
  categories: readonly CategoryRef[];
}

/**
 * A product's one address: `/<lang>/products/<category>/<product>`.
 *
 * The **first** category is the product's home on the storefront — the admin's
 * own order, and the same one the breadcrumb and the buy box already show, so
 * the address a card links to is the address its breadcrumb names.
 *
 * A product nobody has filed keeps the short `/<lang>/products/<product>`: it is
 * not an error state and it is not invisible — an unfiled product is still for
 * sale, and the alternative is a product that cannot be reached at all until
 * somebody categorises it.
 */
export function productPath(product: ProductAddress, locale: Locale): string {
  const category = product.categories.at(0);

  return localePath(
    locale,
    category
      ? `/products/${category.slug}/${product.slug}`
      : `/products/${product.slug}`,
  );
}

/** A category's page: `/<lang>/products/<category>`. */
export function categoryPath(
  category: { slug: string },
  locale: Locale,
): string {
  return localePath(locale, `/products/${category.slug}`);
}

/**
 * Where a request for `requestedPath` should be sent instead — or `null` when
 * it is already the product's address.
 *
 * One address per product is the whole point: a product is under the category
 * it is filed in, not under whichever of its categories somebody happened to
 * type, and the address it used to have before categories were in the URL must
 * not keep a second life as a page crawlers can find. Both cases are the same
 * rule, which is why they are the same function.
 *
 * `requestedPath` is the path the request arrived on, language included — the
 * page has it from the URL. That is what makes a stale slug redirect to the
 * current one inside a language: `/de/products/audio/wireless-earbuds` is the
 * English slug, and the day a German translation is written the same page is
 * served at `/de/products/audio/kabellose-ohrhorer` and the old address is
 * sent there.
 */
export function canonicalRedirect(
  product: ProductAddress,
  requestedPath: string,
  locale: Locale,
): string | null {
  const canonical = productPath(product, locale);

  return canonical === requestedPath ? null : canonical;
}

/**
 * The same question for a category — and it is a second function rather than
 * an overload because a category's address is built by `categoryPath`, which
 * takes a category and not a product.
 *
 * A category has one address per language too, and `/de/products/headphones`
 * is not a second home for the German one: before this existed, the German
 * page kept serving at the English slug — reachable, but at an address no card
 * links to and no German page names.
 */
export function categoryRedirect(
  category: { slug: string },
  requestedPath: string,
  locale: Locale,
): string | null {
  const canonical = categoryPath(category, locale);

  return canonical === requestedPath ? null : canonical;
}
