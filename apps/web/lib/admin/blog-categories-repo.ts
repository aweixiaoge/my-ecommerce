import { prisma } from "@my-ecommerce/db";
import type { AdminBlogCategoryCreate } from "@my-ecommerce/shared";
import { DEFAULT_LOCALE } from "../locale";
import { SLUG_ATTEMPTS, SlugExhaustedError, slugAttempt, slugify } from "./slug";

/**
 * Where the admin reads and writes blog categories.
 *
 * A near-copy of `categories-repo`, deliberately: the interesting part of a
 * create is not the row, it is the retry a unique constraint forces on anyone
 * who generates a slug, and that logic should be recognisable rather than
 * reinvented. What is *not* shared is the screens' futures — see the note on
 * `AdminBlogCategoryCreateSchema` — and that is why this is a sibling file
 * rather than a parameter of the other one.
 */

/**
 * Stores a category and returns its id.
 *
 * The slug is generated from the name and then *retried* rather than checked
 * first: querying for a free slug and inserting it is two statements with a gap
 * between them, and two admins saving the same name at once is exactly the case
 * that gap loses.
 */
export async function createBlogCategory(
  input: AdminBlogCategoryCreate,
): Promise<string> {
  // "category" rather than this entity's own word: the fallback is the noun the
  // slug stands in for, and it is a category either way.
  const base = slugify(input.name, "category");

  for (let attempt = 1; attempt <= SLUG_ATTEMPTS; attempt++) {
    try {
      return await insertBlogCategory(input, slugAttempt(base, attempt));
    } catch (error) {
      if (isSlugTaken(error)) continue;
      throw error;
    }
  }

  throw new SlugExhaustedError(base);
}

/**
 * The category and its translation, in one write.
 *
 * A single nested create, like a product category: nothing here needs an id the
 * statement is about to mint, and Prisma runs a nested create in a transaction
 * of its own, so a category whose translation failed to write cannot leave a
 * nameless row behind.
 */
async function insertBlogCategory(
  input: AdminBlogCategoryCreate,
  slug: string,
): Promise<string> {
  const category = await prisma.blogCategory.create({
    data: {
      translations: {
        create: { locale: DEFAULT_LOCALE, name: input.name, slug },
      },
    },
  });

  return category.id;
}

/**
 * Whether the insert tripped the slug's unique constraint.
 *
 * A `P2002` on *this* insert can only be the slug: the row is new and its id is
 * minted by the same statement, so the other unique — `(category_id, locale)`
 * — cannot be the one that fired.
 */
function isSlugTaken(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  return (error as { code?: unknown }).code === "P2002";
}

/** What the category list needs, one row per category. */
export interface AdminBlogCategorySummary {
  id: string;
  name: string;
  slug: string;
}

/**
 * Every blog category, in the order they were added.
 *
 * The id is the tiebreak for the reason `listCategories` writes down: a
 * timestamp alone ties, and one ordering key would leave the rest to Postgres —
 * a list that reorders itself under a click is a list that gets the wrong row
 * clicked.
 */
export async function listBlogCategories(): Promise<AdminBlogCategorySummary[]> {
  const categories = await prisma.blogCategory.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { translations: { where: { locale: DEFAULT_LOCALE } } },
  });

  return categories.map((category) => {
    const translation = category.translations[0];

    return {
      id: category.id,
      // A category with no translation in this locale is not a state this app
      // can produce — every create writes one — so the fallback is for a row
      // someone inserted by hand, and an empty name beats a crash in a list.
      name: translation?.name ?? "",
      slug: translation?.slug ?? "",
    };
  });
}
