"use server";

import { redirect } from "next/navigation";
import {
  AdminBlogCreateSchema,
  IMAGES_PER_BLOG_MAX,
} from "@my-ecommerce/shared";
import {
  BlogNotFoundError,
  createBlog,
  UnknownCategoryError,
  updateBlog,
} from "@/lib/admin/blogs-repo";
import { getSession } from "@/lib/admin/session";
import { SlugExhaustedError } from "@/lib/admin/slug";
import { noticeFor } from "@/lib/admin/translation-notice";
import { translateBlog } from "@/lib/admin/translations";

/**
 * What the blog screens do.
 *
 * Thin on purpose, like the product and category actions: the rules are the
 * shared schema's and the queries are the repository's. All this adds is the
 * two things that need a request — reading the form, and the redirect
 * afterwards.
 *
 * Server Actions are reachable by direct POST, not only through the form that
 * renders here, so everything is re-derived from `formData` and validated
 * before a single field reaches the store.
 */

export interface BlogFormState {
  errors?: {
    title?: string[];
    shortDescription?: string[];
    description?: string[];
    categoryId?: string[];
    /**
     * Listed here AND in `fieldErrors` below. A path this object does not name
     * is dropped on the floor, and the form would then render no message at all
     * for a submission it refused — a submit button that appears to do nothing.
     */
    mediaIds?: string[];
  };
  message?: string;
}

export async function createBlogAction(
  _prevState: BlogFormState | undefined,
  formData: FormData,
): Promise<BlogFormState | undefined> {
  // The shell layout refuses anyone who is not signed in, but that is a
  // render-time gate and this is reachable by direct POST. Validating the
  // payload is not the same as knowing who sent it: without this, a request
  // with no session at all writes a post into the journal.
  if (!(await getSession())) {
    return { message: "Your session has expired. Sign in again." };
  }

  const parsed = AdminBlogCreateSchema.safeParse(readBlogForm(formData));

  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };

  /*
   * The write can fail in ways the payload cannot know about — a category that
   * is no longer a row, a slug every hundred titles are taken for, a database
   * that is not running — and each of those has a sentence, because the
   * alternative is a 500 the person cannot act on. The `catch` is narrow on
   * purpose: `redirect` signals by throwing, so it must stay outside.
   */
  let id: string;
  try {
    id = await createBlog(parsed.data);
  } catch (error) {
    return blogSaveFailure(error);
  }

  /*
   * After the write, and never before it: the row a person typed is the thing
   * the screen is reporting on, and a translation that does not happen must
   * not cost them that. The pass catches its own failures per language, so the
   * only thing it can do here is report.
   */
  const run = await translateBlog(id);

  redirect(`/admin/blogs?translated=${noticeFor(run)}`);
}

/**
 * Saves a post that already exists.
 *
 * The same form and the same schema as the create action — the edit screen is
 * the create screen with the post's values in it — plus the id, which travels
 * in a hidden field. Like a product edit, it translates afterwards: languages
 * the machine wrote are refreshed from the new English, and a language
 * somebody corrected by hand is left as they wrote it.
 */
export async function updateBlogAction(
  _prevState: BlogFormState | undefined,
  formData: FormData,
): Promise<BlogFormState | undefined> {
  if (!(await getSession())) {
    return { message: "Your session has expired. Sign in again." };
  }

  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    return { message: "That post could not be identified. Reload and try again." };
  }

  const parsed = AdminBlogCreateSchema.safeParse(readBlogForm(formData));

  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };

  try {
    await updateBlog(id, parsed.data);
  } catch (error) {
    return blogSaveFailure(error);
  }

  // Outside the `try`: `redirect` signals by throwing.
  redirect(`/admin/blogs?translated=${noticeFor(await translateBlog(id))}`);
}

/**
 * The form, as the schema wants it.
 *
 * `?? ""` for the fields a draft may leave blank: a post submitted before its
 * blurb was written is not an error, it is an empty blurb. The images arrive as
 * one JSON field because a form can only send strings — the ids of the uploads
 * the form already made, in the order the author arranged them.
 */
function readBlogForm(formData: FormData) {
  return {
    title: formData.get("title") ?? "",
    shortDescription: formData.get("shortDescription") ?? "",
    description: formData.get("description") ?? "",
    // A select with nothing chosen sends the empty string, and `?? ""` covers a
    // field that never arrived at all — both are "no category" to the schema,
    // which refuses them with the sentence the field renders.
    categoryId: formData.get("categoryId") ?? "",
    mediaIds: readJson(formData.get("mediaIds")),
  };
}

/**
 * What to say when the write was refused, in the shape the form can render.
 *
 * The one the person can act on is reported against the field it belongs to —
 * a category that is no longer a row to the dropdown — rather than as a banner
 * they have to connect to a field themselves.
 */
function blogSaveFailure(error: unknown): BlogFormState {
  if (error instanceof UnknownCategoryError) {
    return { errors: { categoryId: [error.message] } };
  }

  if (error instanceof SlugExhaustedError) return { message: error.message };
  if (error instanceof BlogNotFoundError) return { message: error.message };

  console.error("Saving a blog post failed:", error);
  return {
    message:
      "The post could not be saved. Try again, and check the server is running if it keeps failing.",
  };
}

/**
 * A structured field, as JSON.
 *
 * The images arrive as one JSON field because they are structured and a form
 * can only send strings. Anything unreadable becomes `null`, which the schema
 * refuses — the alternative, throwing here, would turn a tampered field into a
 * 500 instead of a message.
 */
function readJson(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || raw === "") return [];

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Validation issues as messages a person can act on.
 *
 * The copy lives here rather than in the shared schema for the reason given in
 * `lib/admin/authenticate.ts`: the schema is the contract both apps validate
 * against, and UI strings are not its business — least of all when the
 * storefront is heading for multi-language (plan.md, decision 1).
 */
function fieldErrors(
  issues: readonly { code: string; path: readonly PropertyKey[] }[],
): BlogFormState["errors"] {
  const errors: NonNullable<BlogFormState["errors"]> = {};

  for (const issue of issues) {
    const field = String(issue.path[0]);
    if (
      field !== "title" &&
      field !== "shortDescription" &&
      field !== "description" &&
      field !== "categoryId" &&
      field !== "mediaIds"
    ) {
      continue;
    }

    (errors[field] ??= []).push(messageFor(field, issue));
  }

  return errors;
}

function messageFor(
  field:
    | "title"
    | "shortDescription"
    | "description"
    | "categoryId"
    | "mediaIds",
  issue: { code: string },
): string {
  switch (field) {
    case "title":
      return issue.code === "too_big" ? "Title is too long." : "Enter a title.";
    case "shortDescription":
      return "Short description is too long.";
    case "description":
      return "Description is too long.";
    case "categoryId":
      // Two codes, and the pair covers everything the field can produce: an
      // empty or missing value is `too_small`, a longer-than-an-id one is
      // `too_big`, and a non-string is the one other possibility — which is not
      // a category either.
      return issue.code === "too_small"
        ? "Choose a category."
        : "That category is not valid.";
    case "mediaIds":
      // `too_big` is the array over its cap — the one refusal a crafted POST
      // can reach that the picker cannot, since the picker never offers more
      // than the cap. Everything else (a blob that parsed to the wrong shape,
      // an id that is not an id) gets one sentence that says what to check.
      return issue.code === "too_big"
        ? `A post holds at most ${IMAGES_PER_BLOG_MAX} images.`
        : "The images are not valid. Remove them and try again.";
  }
}
