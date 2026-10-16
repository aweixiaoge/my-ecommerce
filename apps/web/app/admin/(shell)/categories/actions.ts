"use server";

import { redirect } from "next/navigation";
import { AdminCategoryCreateSchema } from "@my-ecommerce/shared";
import { createCategory } from "@/lib/admin/categories-repo";
import { getSession } from "@/lib/admin/session";
import { SlugExhaustedError } from "@/lib/admin/slug";

/**
 * What the category screens do.
 *
 * Thin on purpose, like the product actions: the rule is the shared schema's
 * and the query is the repository's. All this adds is the two things that need
 * a request — reading the form, and the redirect afterwards.
 *
 * Server Actions are reachable by direct POST, not only through the form that
 * renders here, so the payload is re-derived from `formData` and validated
 * before a single field reaches the store.
 */

export interface CategoryFormState {
  errors?: {
    name?: string[];
  };
  message?: string;
}

export async function createCategoryAction(
  _prevState: CategoryFormState | undefined,
  formData: FormData,
): Promise<CategoryFormState | undefined> {
  // The shell layout refuses anyone who is not signed in, but that is a
  // render-time gate and this is reachable by direct POST. Validating the
  // payload is not the same as knowing who sent it: without this, a request
  // with no session at all writes a category into the catalogue.
  if (!(await getSession())) {
    return { message: "Your session has expired. Sign in again." };
  }

  const parsed = AdminCategoryCreateSchema.safeParse({
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
  try {
    await createCategory(parsed.data);
  } catch (error) {
    return categorySaveFailure(error);
  }

  redirect("/admin/categories");
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
 * the name's. A schema change that added a field would have to add its message
 * here too, which is the point — no message is ever dropped on the floor and
 * rendered as a submit button that appears to do nothing.
 */
function fieldErrors(
  issues: readonly { code: string }[],
): CategoryFormState["errors"] {
  const errors: NonNullable<CategoryFormState["errors"]> = {};

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
 * something about, and it is knowable only here: the payload's own schema
 * checks the name against itself, but only the database knows what else is in
 * the catalogue.
 *
 * Anything else is logged and replaced with one sentence. A Postgres error
 * string is written for whoever wrote the query, and pasting it into the page
 * tells the person nothing they can use — but swallowing it entirely would
 * leave an operator with a page that says "try again" and a log that says
 * nothing at all.
 */
function categorySaveFailure(error: unknown): CategoryFormState {
  if (error instanceof SlugExhaustedError) return { message: error.message };

  console.error("Creating a category failed:", error);
  return {
    message:
      "The category could not be saved. Try again, and check the server is running if it keeps failing.",
  };
}
