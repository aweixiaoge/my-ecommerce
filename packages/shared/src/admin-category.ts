import { z } from "zod";

/**
 * The admin's category-create payload — the write side of the category tree.
 *
 * One field, and that is the shape rather than a first instalment: a category
 * is a name and a place in the tree, and the create screen knows neither the
 * place (a new category is a root until the tree screen moves it) nor the URL
 * (the slug is generated from the name, unique within a locale — plan.md,
 * decision 2). A slug box would be a second spelling of the same word that
 * could disagree with the first.
 */

/** The same ceiling a product name gets: a bound far above any real name. */
const NAME_MAX = 200;

export const AdminCategoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX),
});

export type AdminCategoryCreate = z.infer<typeof AdminCategoryCreateSchema>;
