import { prisma } from "@my-ecommerce/db";
import type { AdminBlogCreate } from "@my-ecommerce/shared";
import { DEFAULT_LOCALE } from "../locale";
import { SLUG_ATTEMPTS, SlugExhaustedError, slugAttempt, slugify } from "./slug";

/**
 * Where the admin reads and writes blog posts.
 *
 * The same shape as `products-repo` and `categories-repo` — a create that
 * retries a generated slug, a list that reduces rows — carrying the part each
 * of those needs and the others do not: a transaction, because a post's images
 * are claimed only after its own row exists to claim them for, and a category
 * that can turn out not to be a row at all.
 */

/**
 * The category the form named is not a row.
 *
 * The payload's own rule is that a category was chosen, and no rule above the
 * database can say whether the row it names is still there — a category deleted
 * in another tab between the form loading and the save is the realistic way in,
 * and a crafted POST is the other. There is no delete screen yet, which makes
 * this rare rather than impossible — and `SetNull` means a post can outlive its
 * category — so this is the sentence a person needs rather than the generic one
 * about the server being down.
 */
export class UnknownCategoryError extends Error {
  constructor() {
    super("That category no longer exists. Choose another.");
    this.name = "UnknownCategoryError";
  }
}

/**
 * Stores a post and returns its id.
 *
 * The slug is generated from the title and then *retried* rather than checked
 * first, the way every slug in this app is: querying for a free one and
 * inserting it is two statements with a gap between them, and the unique
 * constraint is the only thing that actually knows.
 */
export async function createBlog(input: AdminBlogCreate): Promise<string> {
  // "blog" rather than the default "product": a title that slugs to nothing
  // still needs a URL, and the word it falls back to is this entity's.
  const base = slugify(input.title, "blog");

  for (let attempt = 1; attempt <= SLUG_ATTEMPTS; attempt++) {
    try {
      return await insertBlog(input, slugAttempt(base, attempt));
    } catch (error) {
      // A category that is not a row is not something a different slug fixes,
      // and it must not be swallowed into the retry: the post would be saved
      // reporting a slug problem for a category problem.
      if (isMissingCategory(error)) throw new UnknownCategoryError();
      if (isSlugTaken(error)) continue;
      throw error;
    }
  }

  throw new SlugExhaustedError(base);
}

/**
 * The post and its images, in one transaction.
 *
 * Two steps rather than one nested create: the images were uploaded before the
 * post existed, so they are claimed here rather than created here. Either the
 * post, its translation and its gallery are all stored, or none of it is — a
 * post whose images stayed unclaimed would look like the form had forgotten
 * them.
 */
async function insertBlog(input: AdminBlogCreate, slug: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const blog = await tx.blog.create({
      data: {
        categoryId: input.categoryId,
        translations: {
          create: {
            locale: DEFAULT_LOCALE,
            title: input.title,
            slug,
            shortDescription: input.shortDescription,
            description: input.description,
          },
        },
      },
    });

    // `updateMany` rather than `update`: an id that names nothing — a tampered
    // payload, or an upload from a form someone abandoned — is a no-op, where
    // `update` would throw and lose the whole post over an image nobody will
    // see. Position is the order the form showed, with zero as the Main image.
    for (const [position, mediaId] of input.mediaIds.entries()) {
      await tx.media.updateMany({
        where: { id: mediaId },
        data: { blogId: blog.id, position },
      });
    }

    return blog.id;
  });
}

/**
 * The post that was asked to be edited is not a row — deleted in another tab
 * between the edit screen loading and the save, or an id somebody typed.
 */
export class BlogNotFoundError extends Error {
  constructor() {
    super("That post no longer exists. Go back to the list and reload it.");
    this.name = "BlogNotFoundError";
  }
}

/** A post as the edit screen loads it: the create form's fields, filled in. */
export interface BlogForEdit {
  id: string;
  /** The form is keyed by it — see the edit page. */
  updatedAt: string;
  title: string;
  shortDescription: string;
  description: string;
  /** Null when the post's category was deleted from under it. */
  categoryId: string | null;
  /** In the order the form showed them, the first being the Main image. */
  mediaIds: string[];
}

/**
 * The post, or null when there is no such row — the id is in the URL, and the
 * page turns a wrong one into a 404, as the product edit screen does.
 */
export async function getBlogForEdit(id: string): Promise<BlogForEdit | null> {
  const blog = await prisma.blog.findUnique({
    where: { id },
    include: {
      translations: { where: { locale: DEFAULT_LOCALE } },
      media: { orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true } },
    },
  });

  if (!blog) return null;

  // A post with no English row is not something this app writes; an empty
  // form beats a crash, and saving writes the row it was missing.
  const translation = blog.translations[0];

  return {
    id: blog.id,
    updatedAt: blog.updatedAt.toISOString(),
    title: translation?.title ?? "",
    shortDescription: translation?.shortDescription ?? "",
    description: translation?.description ?? "",
    categoryId: blog.categoryId,
    mediaIds: blog.media.map((media) => media.id),
  };
}

/**
 * Rewrites a post: its English copy, its category and its images.
 *
 * The slug follows the title, as on create and as a product's does on edit —
 * retried the same way, because a renamed post can land on another post's
 * slug. Saving an unchanged title regenerates the slug the row already holds,
 * which the unique index accepts as the same row.
 */
export async function updateBlog(id: string, input: AdminBlogCreate): Promise<void> {
  const base = slugify(input.title, "blog");

  for (let attempt = 1; attempt <= SLUG_ATTEMPTS; attempt++) {
    try {
      await writeBlog(id, input, slugAttempt(base, attempt));
      return;
    } catch (error) {
      if (isMissingRow(error)) throw new BlogNotFoundError();
      if (isMissingCategory(error)) throw new UnknownCategoryError();
      if (isSlugTaken(error)) continue;
      throw error;
    }
  }

  throw new SlugExhaustedError(base);
}

/**
 * One save, one transaction — the product edit's reasoning: a post that is
 * half of what was on screen is worse than one that did not change.
 */
async function writeBlog(id: string, input: AdminBlogCreate, slug: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // The category lives on the row itself, and `updatedAt` moves with any
    // update — which the edit screen's key depends on.
    await tx.blog.update({ where: { id }, data: { categoryId: input.categoryId } });

    await tx.blogTranslation.upsert({
      where: { blogId_locale: { blogId: id, locale: DEFAULT_LOCALE } },
      create: {
        blogId: id,
        locale: DEFAULT_LOCALE,
        title: input.title,
        slug,
        shortDescription: input.shortDescription,
        description: input.description,
      },
      update: {
        title: input.title,
        slug,
        shortDescription: input.shortDescription,
        description: input.description,
      },
    });

    // Re-claimed in the order on screen, so a reorder is a save like any other.
    for (const [position, mediaId] of input.mediaIds.entries()) {
      await tx.media.updateMany({ where: { id: mediaId }, data: { blogId: id, position } });
    }

    // Images taken off the form. An upload is made for one post and claimed by
    // one save, so a removed one has no other reader — the product edit's rule.
    await tx.media.deleteMany({ where: { blogId: id, id: { notIn: [...input.mediaIds] } } });
  });
}

/** What the post list needs, one row per post. */
export interface AdminBlogSummary {
  id: string;
  title: string;
  /** Empty when the post has no category, or none in this locale. */
  categoryName: string;
  /** ISO 8601 — the page formats it; nothing is stored preformatted. */
  createdAt: string;
}

/**
 * Every post, newest first.
 *
 * The id is the tiebreak for the reason `listCategories` writes down: one
 * ordering key leaves the rest to Postgres, and a list that shuffles between
 * reads is a list that gets the wrong row clicked. Two posts saved in the same
 * millisecond fall back on the id, which never ties.
 */
export async function listBlogs(): Promise<AdminBlogSummary[]> {
  const blogs = await prisma.blog.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      translations: { where: { locale: DEFAULT_LOCALE } },
      // The category is nullable — `SetNull` unfiles a post when its category is
      // deleted — so the include is of a row that may not be there, and the
      // mapping below answers the missing case.
      category: {
        include: { translations: { where: { locale: DEFAULT_LOCALE } } },
      },
    },
  });

  return blogs.map((blog) => ({
    id: blog.id,
    // A post with no translation in this locale is not a state this app can
    // produce — every create writes one — so the fallback is for a row someone
    // inserted by hand, and an empty title beats a crash in a list.
    title: blog.translations[0]?.title ?? "",
    // Same reasoning, one step out: a post whose category was taken away has
    // none, and a blank cell says so without taking the list down.
    categoryName: blog.category?.translations[0]?.name ?? "",
    createdAt: blog.createdAt.toISOString(),
  }));
}

/**
 * Whether the insert tripped the slug's unique constraint.
 *
 * A `P2002` on *this* insert can only be the slug. The row is new and its id is
 * minted by the same statement, so the other unique `blog_translations` carries
 * — `(blog_id, locale)` — cannot be the one that fired, and the product repo's
 * haystack of constraint names would be reading a choice out of an error that
 * does not offer one.
 */
function isSlugTaken(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  return (error as { code?: unknown }).code === "P2002";
}

/**
 * Whether this is the category's foreign key refusing the insert.
 *
 * A `P2003` here can only be the category: it is the one client-supplied id in
 * the statement — every other foreign key is a row the same transaction just
 * created. The `typeof` guard is the same one every classifier in this app
 * carries, because `throw null` is legal.
 */
function isMissingCategory(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  return (error as { code?: unknown }).code === "P2003";
}

/** Whether the post being updated is gone — Prisma's "record to update not found". */
function isMissingRow(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  return (error as { code?: unknown }).code === "P2025";
}
