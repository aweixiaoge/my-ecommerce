"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  AdminProductCreateSchema,
  AdminProductPublishSchema,
} from "@my-ecommerce/shared";
import {
  createProduct,
  DuplicateSkuError,
  setProductStatus,
  UnknownCategoryError,
  updateProduct,
} from "@/lib/admin/products-repo";
import { getSession } from "@/lib/admin/session";
import { SlugExhaustedError } from "@/lib/admin/slug";
import { noticeFor } from "@/lib/admin/translation-notice";
import { translateProduct } from "@/lib/admin/translations";

/**
 * What the products screens do.
 *
 * Thin on purpose, like the sign-in action: the rules are the shared schema's,
 * and the queries are the repository's. All this adds is the two things that
 * need a request — reading the form, and the redirect or refresh afterwards.
 *
 * Server Actions are reachable by direct POST, not only through the form that
 * renders here, so everything is re-derived from `formData` and validated
 * before a single field reaches the store.
 */

export interface ProductFormState {
  errors?: {
    name?: string[];
    shortDescription?: string[];
    description?: string[];
    categoryId?: string[];
    attributes?: string[];
    /**
     * Listed here AND in `fieldErrors` below. A path this object does not name
     * is dropped on the floor, and the form would then render no message at all
     * for a submission it refused — a submit button that appears to do nothing.
     */
    variants?: string[];
  };
  message?: string;
}

export async function createProductAction(
  _prevState: ProductFormState | undefined,
  formData: FormData,
): Promise<ProductFormState | undefined> {
  // The shell layout refuses anyone who is not signed in, but that is a
  // render-time gate and this is reachable by direct POST. Validating the
  // payload is not the same as knowing who sent it: without this, a request
  // with no session at all writes a product into the store.
  if (!(await getSession())) {
    return { message: "Your session has expired. Sign in again." };
  }

  const parsed = AdminProductCreateSchema.safeParse(readProductForm(formData));

  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };

  /*
   * The write can fail in ways the payload cannot know about — a SKU another
   * product already uses, a slug every hundred names are taken for, a database
   * that is not running — and each of those has a sentence, because the
   * alternative is a 500 the person cannot act on. The `catch` is narrow on
   * purpose: `redirect` signals by throwing, so it must stay outside.
   */
  let id: string;
  try {
    id = await createProduct(parsed.data);
  } catch (error) {
    return productSaveFailure(error);
  }

  /*
   * After the write, and never before it: the row a person typed is the thing
   * the screen is reporting on, and a translation that does not happen must
   * not cost them that. The pass catches its own failures per language, so the
   * only thing it can do here is report.
   */
  redirect(`/admin/products?translated=${noticeFor(await translateProduct(id))}`);
}

/**
 * Saves a product that already exists.
 *
 * It takes the *same* form the create action takes, because the screen is the
 * same screen — the edit page renders this form with the product's values in
 * it, and the only thing that changes is which action the form posts to and
 * that the id travels with it. Two payload shapes for one form would be two
 * places for the screen and the schema to disagree.
 */
export async function updateProductAction(
  _prevState: ProductFormState | undefined,
  formData: FormData,
): Promise<ProductFormState | undefined> {
  if (!(await getSession())) {
    return { message: "Your session has expired. Sign in again." };
  }

  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    return { message: "That product could not be identified. Reload and try again." };
  }

  const parsed = AdminProductCreateSchema.safeParse(readProductForm(formData));

  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };

  try {
    await updateProduct(id, parsed.data);
  } catch (error) {
    return productSaveFailure(error);
  }

  /*
   * An edit translates too, and that is the rule the `autoTranslated` column
   * exists for: a language the machine wrote is refreshed from the English
   * that was just saved, and a language somebody corrected by hand is left
   * exactly as they typed it.
   */
  redirect(`/admin/products?translated=${noticeFor(await translateProduct(id))}`);
}

/**
 * The form, as the schema wants it.
 *
 * `?? ""` for the fields a draft may leave blank: a form that submitted without
 * them is not an error, it is an empty description.
 */
function readProductForm(formData: FormData) {
  return {
    name: formData.get("name") ?? "",
    shortDescription: formData.get("shortDescription") ?? "",
    description: formData.get("description") ?? "",
    // A select with nothing chosen sends the empty string, and `?? ""` covers a
    // field that never arrived at all — both are "no category" to the schema,
    // which refuses them with the sentence the field renders.
    categoryId: formData.get("categoryId") ?? "",
    attributes: readJson(formData.get("attributes")),
    variants: readJson(formData.get("variants")),
  };
}

/**
 * What to say when the write was refused, in the shape the form can render.
 *
 * The two the person can act on are reported against the field they belong to —
 * a taken SKU to the colour rows, a category that is no longer a row to the
 * dropdown — rather than as a banner they have to connect to a field
 * themselves.
 */
function productSaveFailure(error: unknown): ProductFormState {
  if (error instanceof DuplicateSkuError) {
    return { errors: { variants: [error.message] } };
  }

  if (error instanceof UnknownCategoryError) {
    return { errors: { categoryId: [error.message] } };
  }

  return { message: saveFailureMessage(error) };
}

/**
 * Publishes or unpublishes a product, from a button in the list.
 *
 * A form action rather than a handler a client component calls, because a
 * button that changes what a shop sells should work before React has finished
 * loading — and because a row of the list is a Server Component with nothing
 * else to keep in state.
 *
 * `refresh` rather than `revalidatePath`: the list reads the database at
 * request time and nothing about it is cached, so there is no cache entry to
 * drop — what has to happen is the client router re-rendering the page it is
 * already on. Revalidating a path nothing stores is a no-op that reads as if
 * it did something.
 */
export async function setProductStatusAction(formData: FormData): Promise<void> {
  if (!(await getSession())) redirect("/admin/login");

  const parsed = AdminProductPublishSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });

  // Nothing to say about a payload the app cannot produce: the buttons only
  // ever send one of two words, so a third one is a crafted POST and there is
  // no field on screen to report it against.
  if (!parsed.success) return;

  await setProductStatus(parsed.data.id, parsed.data.status);

  refresh();
}

/**
 * What to tell someone when the database refused the write.
 *
 * A taken SKU is the one a person can do something about, and it is knowable
 * only here: the payload's own schema checks SKUs against each other, but only
 * the database knows what else is in the catalogue. The message names the field
 * it belongs to, so it lands next to the colours rather than at the top of the
 * form.
 *
 * Anything else is logged and replaced with one sentence. A Postgres error
 * string is written for whoever wrote the query, and pasting it into the page
 * tells the person nothing they can use — but swallowing it entirely would
 * leave an operator with a page that says "try again" and a log that says
 * nothing at all.
 */
function saveFailureMessage(error: unknown): string {
  if (error instanceof SlugExhaustedError) return error.message;

  console.error("Creating a product failed:", error);
  return "The product could not be saved. Try again, and check the server is running if it keeps failing.";
}

/**
 * A structured field, as JSON.
 *
 * Attributes and variants arrive as one JSON field each because they are
 * structured and a form can only send strings. Anything unreadable becomes
 * `null`, which the schema refuses — the alternative, throwing here, would turn
 * a tampered field into a 500 instead of a message.
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
  issues: readonly { code: string; path: readonly PropertyKey[]; message?: string }[],
): ProductFormState["errors"] {
  const errors: NonNullable<ProductFormState["errors"]> = {};

  for (const issue of issues) {
    const field = String(issue.path[0]);
    if (
      field !== "name" &&
      field !== "shortDescription" &&
      field !== "description" &&
      field !== "categoryId" &&
      field !== "attributes" &&
      field !== "variants"
    ) {
      continue;
    }

    (errors[field] ??= []).push(messageFor(field, issue));
  }

  return errors;
}

function messageFor(
  field:
    | "name"
    | "shortDescription"
    | "description"
    | "categoryId"
    | "attributes"
    | "variants",
  issue: { code: string; message?: string },
): string {
  switch (field) {
    case "name":
      return issue.code === "too_big" ? "Name is too long." : "Enter a name.";
    case "shortDescription":
      return "Short description is too long.";
    case "description":
      return "Description is too long.";
    case "categoryId":
      // Two codes, and the pair covers everything the field can produce: an
      // empty or missing value is `too_small`, a longer-than-an-id one is
      // `too_big`, and a non-string (a file posted under this name) is the one
      // other possibility — which is not a category either.
      return issue.code === "too_small"
        ? "Choose a category."
        : "That category is not valid.";
    case "attributes":
      // `custom` is a refinement we wrote, and its message is already written
      // for a person — "Values must be unique." Zod's own codes are not, so
      // they get one message that says what to check.
      return issue.code === "custom" && issue.message
        ? issue.message
        : "The attributes are not valid. Check the values and try again.";
    case "variants":
      // Same split, and here the refinements do most of the work: which colour
      // is unknown, which SKU is used twice and which price is not an amount
      // are all sentences this schema wrote for a person to read.
      return issue.code === "custom" && issue.message
        ? issue.message
        : "A colour's price, stock or SKU is not valid. Check them and try again.";
  }
}
