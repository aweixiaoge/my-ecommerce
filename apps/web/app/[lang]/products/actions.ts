"use server";

import { ReviewCreateSchema } from "@my-ecommerce/shared";
import { createReview } from "@/lib/catalog/reviews-repo";
import { getMessages, type Messages } from "@/lib/i18n/messages";
import { hasLocale, type Locale } from "@/lib/languages";
import { DEFAULT_LOCALE } from "@/lib/locale";

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

/**
 * The language the submission came from.
 *
 * The form posts a hidden field, because a Server Action has no URL segment to
 * read. Anything that is not one of the storefront's languages — a tampered
 * payload, an old tab — falls back to the default rather than failing the
 * submission: the review is the thing being stored, and the language tag is a
 * note about where it was written.
 */
function submittedLocale(raw: FormDataEntryValue | null): Locale {
  const value = typeof raw === "string" ? raw : "";

  return hasLocale(value) ? value : DEFAULT_LOCALE;
}

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
  const locale = submittedLocale(formData.get("locale"));
  const messages = getMessages(locale).reviews.errors;

  const productId = formData.get("productId");
  if (typeof productId !== "string" || productId === "") {
    return { message: messages.productUnknown };
  }

  const parsed = ReviewCreateSchema.safeParse({
    productId,
    authorName: formData.get("authorName") ?? "",
    authorEmail: formData.get("authorEmail") ?? "",
    rating: formData.get("rating"),
    body: formData.get("body") ?? "",
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error.issues, messages) };
  }

  /*
   * The write can fail in ways the payload cannot know about — the product was
   * archived in another tab, or the database is not running — and both are a
   * sentence rather than a 500 the person cannot act on.
   */
  let id: string | null;
  try {
    id = await createReview(parsed.data, locale);
  } catch (error) {
    console.error("Storing a review failed:", error);
    return { message: messages.saveFailed };
  }

  // `null` means the product the payload named is not one the shop is selling.
  // The repository owns that check, because it is the place that writes.
  if (id === null) {
    return { message: messages.productUnavailable };
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
 * The copy is the catalog's, looked up in the language the form said it was
 * rendered in — the schema's business is which field and which rule, never what
 * a person reads. `lib/admin/authenticate.ts` gives the same reason for keeping
 * its own copy out of the shared contract.
 */
function fieldErrors(
  issues: readonly { code: string; path: readonly PropertyKey[] }[],
  messages: Messages["reviews"]["errors"],
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

    (errors[field] ??= []).push(messageFor(field, issue.code, messages));
  }

  return errors;
}

function messageFor(
  field: "authorName" | "authorEmail" | "rating" | "body",
  code: string,
  messages: Messages["reviews"]["errors"],
): string {
  switch (field) {
    case "authorName":
      return code === "too_big" ? messages.nameTooLong : messages.nameRequired;
    case "authorEmail":
      return code === "too_big" ? messages.emailTooLong : messages.emailInvalid;
    case "rating":
      return messages.ratingRange;
    case "body":
      return code === "too_big" ? messages.bodyTooLong : messages.bodyRequired;
  }
}
