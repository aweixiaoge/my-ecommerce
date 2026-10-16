import { prisma, type Prisma } from "@my-ecommerce/db";
import { DEFAULT_LOCALE } from "../locale";

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
const CATEGORY_SELECT = {
  id: true,
  translations: {
    where: { locale: DEFAULT_LOCALE },
    select: { slug: true, name: true, description: true },
  },
} as const satisfies Prisma.CategorySelect;

/** A row as that select returns it. */
export type CategoryRow = Prisma.CategoryGetPayload<{
  select: typeof CATEGORY_SELECT;
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
 * Null covers two states and the page turns both into the same 404: no such
 * slug, and a slug in another locale — a category's name and slug are one row
 * per language, and `/products/ohrstoepsel` is not the English page.
 */
export async function getCategoryBySlug(
  slug: string,
): Promise<CategoryDetail | null> {
  const row = await prisma.category.findFirst({
    where: { translations: { some: { locale: DEFAULT_LOCALE, slug } } },
    select: CATEGORY_SELECT,
  });

  return row ? toCategory(row) : null;
}

/**
 * The row as the page reads it.
 *
 * The null is reachable despite the query's `some` filter for the reason the
 * product repo gives: that filter chooses *which rows* come back, not which
 * translations, so a category whose only English translation was deleted
 * arrives with an empty array.
 */
function toCategory(row: CategoryRow): CategoryDetail | null {
  const translation = row.translations.at(0);
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
