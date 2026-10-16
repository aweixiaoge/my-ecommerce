import { prisma } from "@my-ecommerce/db";
import type { AdminCategoryCreate } from "@my-ecommerce/shared";
import { DEFAULT_LOCALE } from "../locale";
import { SLUG_ATTEMPTS, SlugExhaustedError, slugAttempt, slugify } from "./slug";

/**
 * Where the admin reads and writes categories.
 *
 * The same shape as `products-repo`, and deliberately so: the interesting part
 * of a create is not the row, it is the retry a unique constraint forces on
 * anyone who generates a slug, and that logic should be recognisable rather
 * than reinvented. What is *not* shared is the part products need and
 * categories do not — see `isSlugTaken` below.
 */

/**
 * Stores a category and returns its id.
 *
 * The slug is generated from the name and then *retried* rather than checked
 * first. Querying for a free slug and inserting it is two statements with a gap
 * between them, and two admins saving the same name at once is exactly the case
 * that gap loses — the unique constraint is the only thing that actually knows,
 * so the insert is what asks it.
 */
export async function createCategory(
  input: AdminCategoryCreate,
): Promise<string> {
  // "category" rather than the default "product": a name that slugs to nothing
  // still needs a slug, and the word it falls back to is the entity's.
  const base = slugify(input.name, "category");

  for (let attempt = 1; attempt <= SLUG_ATTEMPTS; attempt++) {
    try {
      return await insertCategory(input, slugAttempt(base, attempt));
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
 * A single nested create, unlike a product: nothing here needs an id the
 * statement is about to mint — a category has no variants, no option values and
 * no images to claim — so there is no second write to order after the first.
 * No explicit transaction either, for the same reason: Prisma runs a nested
 * create in one of its own, so a category whose translation failed to write
 * cannot leave a nameless row behind.
 *
 * What is left unwritten are the two columns the tree screen owns: this row is
 * a root at position zero, which is what the column defaults say, and inventing
 * a place for it here would be the create screen guessing at a screen that does
 * not exist yet.
 */
async function insertCategory(
  input: AdminCategoryCreate,
  slug: string,
): Promise<string> {
  const category = await prisma.category.create({
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
 * A `P2002` on *this* insert can only be the slug. The product repo has to read
 * the constraint's name out of the error because a taken SKU and a taken slug
 * want different answers; here the row is new and its id is minted by the same
 * statement, so the other two uniques it carries — the primary key, and
 * `(category_id, locale)` — cannot be the ones that fired. A check that says
 * that is better than one that pretends there is a choice.
 */
function isSlugTaken(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  return (error as { code?: unknown }).code === "P2002";
}

/** What the category list needs, one row per category. */
export interface AdminCategorySummary {
  id: string;
  name: string;
  slug: string;
}

/**
 * Every category, in the order they were added.
 *
 * `position` first because that is the order the tree will offer siblings in,
 * and `created_at` as the tiebreak because every category this screen can make
 * has a position of zero. Without the second key Postgres is free to return a
 * different order on every read, and a list that reorders itself under a click
 * is a list that gets the wrong row clicked.
 */
export async function listCategories(): Promise<AdminCategorySummary[]> {
  const categories = await prisma.category.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
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
