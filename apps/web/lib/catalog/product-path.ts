import type { CategoryRef } from "@my-ecommerce/shared";

/**
 * Where a product and a category live, as addresses.
 *
 * A module of its own, with no React and no database in it, because these three
 * strings are the whole of the storefront's URL policy and they are read from
 * components in both directions: cards build the address, the product page
 * checks the one it was asked for against it. Written as a template in two
 * components, the rule "a product is under its category" would be two rules the
 * first time one of them changed.
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
 * A product's one address: `/products/<category>/<product>`.
 *
 * The **first** category is the product's home on the storefront — the admin's
 * own order, and the same one the breadcrumb and the buy box already show, so
 * the address a card links to is the address its breadcrumb names.
 *
 * A product nobody has filed keeps the short `/products/<product>`: it is not
 * an error state and it is not invisible — an unfiled product is still for
 * sale, and the alternative is a product that cannot be reached at all until
 * somebody categorises it.
 */
export function productPath(product: ProductAddress): string {
  const category = product.categories.at(0);

  return category
    ? `/products/${category.slug}/${product.slug}`
    : `/products/${product.slug}`;
}

/** A category's page: `/products/<category>`. */
export function categoryPath(category: { slug: string }): string {
  return `/products/${category.slug}`;
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
 */
export function canonicalRedirect(
  product: ProductAddress,
  requestedPath: string,
): string | null {
  const canonical = productPath(product);

  return canonical === requestedPath ? null : canonical;
}
