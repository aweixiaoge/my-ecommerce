"use server";

import { AdminBlogCategoryCreateSchema } from "@my-ecommerce/shared";
import { SlugExhaustedError } from "@/lib/admin/slug";
import { createBlogCategory } from "@/lib/admin/blog-categories-repo";
import { getSession } from "@/lib/admin/session";
import { noticeFor } from "@/lib/admin/translation-notice";
import { redirect } from "next/navigation";
import { translateBlogCategory } from "@/lib/admin/translations";

/**
 * What the blog category screens do.
 *
 * A near-copy of the product category action, deliberately — see the note on
 * the repo — and thin on purpose like every action here: the rule is the shared
 * schema's and the query is the repository's. All this adds is the two things
 * that need a request — reading the form, and the redirect afterwards.
 *
 * Server Actions are reachable by direct POST, not only through the form that
 * renders here, so the payload is re-derived from `formData` and validated
 * before a single field reaches the store.
 */

export interface BlogCategoryFormState {
  errors?: {
    name?: string[];
  };
  message?: string;
}

export async function createBlogCategoryAction(
  _prevState: BlogCategoryFormState | undefined,
  formData: FormData,
): Promise<BlogCategoryFormState | undefined> {
  // The shell layout refuses anyone who is not signed in, but that is a
  // render-time gate and this is reachable by direct POST. Validating the
  // payload is not the same as knowing who sent it: without this, a request
  // with no session at all writes a category into the journal.
  if (!(await getSession())) {
    return { message: "Your session has expired. Sign in again." };
  }

  const parsed = AdminBlogCategoryCreateSchema.safeParse({
    name: formData.get("name") ?? "",
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };

  /*
   * The write can fail in ways the payload cannot know about — a slug every
   * hundred names are taken for, a database that is not running — and each of
   * those has a sentence, because the alternative is a 500 the person cannot
   * act on. The `catch` is narrow on purpose: `redirect` signals by throwing,
   * so it must stay outside.
   */
  let id: string;
  try {
    id = await createBlogCategory(parsed.data);
  } catch (error) {
    return categorySaveFailure(error);
  }

  /*
   * After the write, and never before it: the row a person typed is the thing
   * the screen is reporting on, and a translation that does not happen must
   * not cost them that. The pass catches its own failures per language, so the
   * only thing it can do here is report.
   */
  const run = await translateBlogCategory(id);

  redirect(`/admin/blog-categories?translated=${noticeFor(run)}`);
}

/**
 * Validation issues as messages a person can act on.
 *
 * The copy lives here rather than in the shared schema for the reason given in
 * `lib/admin/authenticate.ts`: the schema is the contract both apps validate
 * against, and UI strings are not its business — least of all when the
 * storefront is heading for multi-language (plan.md, decision 1).
 *
 * There is no path to sort by: the payload has one field, so every issue is
 * the name's.
 */
function fieldErrors(
  issues: readonly { code: string }[],
): BlogCategoryFormState["errors"] {
  const errors: NonNullable<BlogCategoryFormState["errors"]> = {};

  for (const issue of issues) {
    (errors.name ??= []).push(
      issue.code === "too_big" ? "Name is too long." : "Enter a name.",
    );
  }

  return errors;
}

/**
 * What to tell someone when the database refused the write.
 *
 * A name every hundred slugs are taken for is the one failure a person can do
 * something about, and it is knowable only here. Anything else is logged and
 * replaced with one sentence: a Postgres error string is written for whoever
 * wrote the query, and pasting it into the page tells the person nothing they
 * can use — but swallowing it entirely would leave a log that says nothing at
 * all.
 */
function categorySaveFailure(error: unknown): BlogCategoryFormState {
  if (error instanceof SlugExhaustedError) return { message: error.message };

  console.error("Creating a blog category failed:", error);
  return {
    message:
      "The category could not be saved. Try again, and check the server is running if it keeps failing.",
  };
}
