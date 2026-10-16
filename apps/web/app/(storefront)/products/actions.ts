"use server";

import { ReviewCreateSchema } from "@my-ecommerce/shared";
import { createReview } from "@/lib/catalog/reviews-repo";

/**
 * What the review form on a product page does.
 *
 * Thin on purpose, like the admin's product actions: the rules are the shared
 * schema's and the write is the repository's. All this adds is the two things
 * that need a request — reading the form, and saying what happened.
 *
 * There is no session to check, because there are no customer accounts and the
 * design's form is a guest one. The guard rails are the schema's bounds and
 * moderation: everything this can store is `pending` and invisible until a
 * moderator approves it. That is also the honest limit of the anti-abuse story
 * here — there is no rate limit and no captcha, because there is nothing to
 * rate-limit against yet.
 */

export interface ReviewFormState {
  /** Set once the review is stored; the form renders the thanks panel for it. */
  ok?: boolean;
  errors?: {
    /**
     * Listed here AND in `fieldErrors` below. A path this object does not name
     * is dropped on the floor, and the form would then render no message at all
     * for a submission it refused — a submit button that appears to do nothing.
     */
    authorName?: string[];
    authorEmail?: string[];
    rating?: string[];
    body?: string[];
  };
  message?: string;
}

export async function createReviewAction(
  _prevState: ReviewFormState | undefined,
  formData: FormData,
): Promise<ReviewFormState | undefined> {
  // An id, not an index into anything: the hidden field is the only way this
  // action learns which product the review is for, and a payload that carried
  // none has no field on screen to be reported against.
  const productId = formData.get("productId");
  if (typeof productId !== "string" || productId === "") {
    return { message: "That product could not be identified. Reload and try again." };
  }

  const parsed = ReviewCreateSchema.safeParse({
    productId,
    authorName: formData.get("authorName") ?? "",
    authorEmail: formData.get("authorEmail") ?? "",
    rating: formData.get("rating"),
    body: formData.get("body") ?? "",
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };

  /*
   * The write can fail in ways the payload cannot know about — the product was
   * archived in another tab, or the database is not running — and both are a
   * sentence rather than a 500 the person cannot act on.
   */
  let id: string | null;
  try {
    id = await createReview(parsed.data);
  } catch (error) {
    console.error("Storing a review failed:", error);
    return {
      message: "Your review could not be saved. Try again, and check the server is running if it keeps failing.",
    };
  }

  // `null` means the product the payload named is not one the shop is selling.
  // The repository owns that check, because it is the place that writes.
  if (id === null) {
    return { message: "That product is no longer available, so there is nothing to review." };
  }

  /*
   * No `refresh()`, and the difference from the admin's status buttons is the
   * whole reason. An approved review changes what is on the page; this one is
   * `pending`, and the list shows approved rows only — so a refresh would
   * re-render the gallery, the price and the stars to produce byte-identical
   * output. The form says what happened instead.
   */
  return { ok: true };
}

/**
 * Validation issues as messages a person can act on.
 *
 * The copy lives here rather than in the shared schema, for the reason given in
 * `lib/admin/authenticate.ts`: the schema is the contract both apps validate
 * against, and UI strings are not its business — least of all when the
 * storefront is heading for multi-language (plan.md, decision 1).
 */
function fieldErrors(
  issues: readonly { code: string; path: readonly PropertyKey[] }[],
): ReviewFormState["errors"] {
  const errors: NonNullable<ReviewFormState["errors"]> = {};

  for (const issue of issues) {
    const field = String(issue.path[0]);
    if (
      field !== "authorName" &&
      field !== "authorEmail" &&
      field !== "rating" &&
      field !== "body"
    ) {
      continue;
    }

    (errors[field] ??= []).push(messageFor(field, issue.code));
  }

  return errors;
}

function messageFor(
  field: "authorName" | "authorEmail" | "rating" | "body",
  code: string,
): string {
  switch (field) {
    case "authorName":
      return code === "too_big" ? "Name is too long." : "Enter your name.";
    case "authorEmail":
      return code === "too_big"
        ? "Email is too long."
        : "Enter a valid email address.";
    case "rating":
      return "Choose between 1 and 5 stars.";
    case "body":
      return code === "too_big"
        ? "Your review is too long."
        : "Write your review.";
  }
}
