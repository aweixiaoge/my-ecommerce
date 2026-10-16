import { z } from "zod";

/**
 * The admin's blog payloads — the write side of the journal.
 *
 * One module for the feature rather than one per table, the way
 * `admin-featured-product.ts` is scoped to what a screen sends rather than to a
 * row. Two schemas, because the two screens send different things: a post's five
 * fields, and a category's one.
 *
 * A post's images travel as ids, like a product's: the upload returns an id and
 * the id is all the client may claim — a payload that carried a URL could point
 * the journal at anything, and one that carried bytes would make every read of
 * the post drag them along. The file rules (what a mime type may be, how large a
 * file may be) are not re-declared here because they are the same rules as the
 * product form's and already have one home in `admin-product.ts`.
 */

/**
 * How many images one post holds.
 *
 * Its own name rather than the product form's constant, because the two are
 * facts about different things that merely agree for now — a colour row and a
 * post are not the same shape, and changing one should not silently change the
 * other. The number is six for the same reason it is six there: enough for a
 * gallery, few enough that a form holding them all stays one screen.
 */
export const IMAGES_PER_BLOG_MAX = 6;

/**
 * Bounds, not policy.
 *
 * Every limit here is sized the same way the product schema's are: far above any
 * real post, well under anything that would make a request expensive to handle.
 * They are re-declared rather than shared, the way `admin-category.ts` re-states
 * the name bound for its own screen — coupling this form's limits to the product
 * form's would mean the day one screen grows, two have to agree.
 */
const TITLE_MAX = 200;
const SHORT_DESCRIPTION_MAX = 300;
/** Markdown for the post body; a generous ceiling, not a target. */
const DESCRIPTION_MAX = 20_000;
const CATEGORY_ID_MAX = 64;
const MEDIA_ID_MAX = 64;

export const AdminBlogCreateSchema = z.object({
  /** The title the slug is generated from — typed, never the slug itself. */
  title: z.string().trim().min(1).max(TITLE_MAX),
  /** The listing's excerpt. May be empty — a post does not need its blurb yet. */
  shortDescription: z.string().trim().max(SHORT_DESCRIPTION_MAX),
  /** Markdown source. The form renders a preview; the database stores the text. */
  description: z.string().max(DESCRIPTION_MAX),
  /**
   * The category the post is filed under.
   *
   * Required, and an id rather than a name: the category's name is a translation
   * and the only stable way to say which one is to say which row. Required
   * because a journal with unfiled posts is one nobody can browse by topic, which
   * is the whole reason the screen offers the field — the database column is
   * nullable only because `SetNull` must be able to write it.
   */
  categoryId: z.string().min(1).max(CATEGORY_ID_MAX),
  mediaIds: z
    .array(z.string().min(1).max(MEDIA_ID_MAX))
    .max(IMAGES_PER_BLOG_MAX)
    .default([]),
});

export type AdminBlogCreate = z.infer<typeof AdminBlogCreateSchema>;

/** The same ceiling a product name and a category name get. */
const NAME_MAX = 200;

/**
 * The blog category's create payload — one field, and that is the shape rather
 * than a first instalment.
 *
 * A category is a name and a slug is generated from it (plan.md, decision 2), so
 * a slug box would be a second spelling of the same word that could disagree
 * with the first. Deliberately parallel to `AdminCategoryCreateSchema` rather
 * than reusing it: the payloads happen to be identical today, and the screens'
 * futures are not — the day blog categories grow a parent or a position is the
 * day a shared rule would have to change for both.
 */
export const AdminBlogCategoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX),
});

export type AdminBlogCategoryCreate = z.infer<
  typeof AdminBlogCategoryCreateSchema
>;
