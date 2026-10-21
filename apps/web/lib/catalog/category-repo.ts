import { prisma, type Prisma } from "@my-ecommerce/db";
import type { Locale } from "@/lib/languages";
import { categoryPath } from "./product-path";
import { fallbackLocales, shownTranslation } from "./translation";

/**
 * Reading one category, for its page.
 *
 * The user-facing text lives in `category_translations` — plan.md's decision 1
 * — so the lookup goes through that table exactly as a product's does, and the
 * slug it is keyed on is unique within a locale rather than globally. That is
 * also what makes a category's page addressable at all: `/products/<slug>` is
 * an address in one language, and a second language gets its own.
 *
 * What is deliberately *not* here: the tree. A category has a parent and
 * children in the schema, and nothing on the storefront needs either yet — the
 * listing shows a category's own products, and the tree editor that would make
 * descendants worth listing does not exist. `CategorySchema` in the shared
 * contract already describes the full shape for the day a page draws one.
 */

/**
 * The columns a category's page is made of, and no others.
 *
 * A `select` rather than an `include`, as everywhere else in this directory:
 * `include` brings every scalar on the relation, and this page shows a name and
 * at most a sentence.
 */
export function categorySelect(locale: Locale) {
  return {
    id: true,
    translations: {
      where: { locale: { in: fallbackLocales(locale) } },
      select: { slug: true, name: true, description: true, locale: true },
    },
  } as const satisfies Prisma.CategorySelect;
}

/** A row as that select returns it. */
export type CategoryRow = Prisma.CategoryGetPayload<{
  select: ReturnType<typeof categorySelect>;
}>;

/**
 * A category, as its page and its heading read it.
 *
 * Narrower than the shared `CategorySchema` on purpose: `image`, `parent`,
 * `children` and the meta pair are in that contract and none of them is drawn
 * or queryable yet. Reading the fields a screen uses is what keeps a `select`
 * honest — and adding one back is a line here when a screen wants it.
 */
export interface CategoryDetail {
  id: string;
  slug: string;
  name: string;
  /** The category's own copy, empty until somebody writes one. */
  description: string;
}

/**
 * One category by its public URL, or null when there is nothing at that
 * address.
 *
 * Null means no such slug — in the language of the page or in the default one.
 * Both are accepted as addresses, because a category that has not been
 * translated is still a category with products in it: `/de/products/earbuds`
 * finds the English row and renders it under German chrome, which is the same
 * bargain every other read makes. The day a German translation is written, that
 * URL starts redirecting to the German slug — see `categoryRedirect`.
 */
export async function getCategoryBySlug(
  slug: string,
  locale: Locale,
): Promise<CategoryDetail | null> {
  const row = await prisma.category.findFirst({
    where: {
      translations: {
        some: { slug, locale: { in: fallbackLocales(locale) } },
      },
    },
    select: categorySelect(locale),
  });

  return row ? toCategory(row, locale) : null;
}

/**
 * Where a category addressed by *another language's* slug lives in this one —
 * or null when no category has that slug in any language.
 *
 * The product repo's `foreignProductPath`, for the other half of the same
 * problem: a language swapper's link from `/de/products/kopfhorer` to `/fr/`
 * carries the German slug, which `getCategoryBySlug` above answers null for.
 * `/fr/products/kopfhorer` is a French way of asking for the headphones.
 *
 * Same shape, same tie-break, same reason for being a second query rather than
 * a wider first one — see that function.
 */
export async function foreignCategoryPath(
  slug: string,
  locale: Locale,
): Promise<string | null> {
  const row = await prisma.category.findFirst({
    where: { translations: { some: { slug } } },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: categorySelect(locale),
  });
  if (!row) return null;

  const category = toCategory(row, locale);

  return category ? categoryPath(category, locale) : null;
}

/**
 * The row as the page reads it.
 *
 * The null is reachable despite the query's `some` filter for the reason the
 * product repo gives: that filter chooses *which rows* come back, not which
 * translations, so a category whose translations were both deleted arrives with
 * an empty array.
 */
function toCategory(row: CategoryRow, locale: Locale): CategoryDetail | null {
  const translation = shownTranslation(row.translations, locale);
  if (!translation) return null;

  return {
    id: row.id,
    slug: translation.slug,
    name: translation.name,
    // Empty rather than null: a category's description is optional prose, and
    // the page renders nothing for a blank one — the same rule the product
    // page's blurb follows.
    description: translation.description,
  };
}
