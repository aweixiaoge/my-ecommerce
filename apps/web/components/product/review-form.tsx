"use client";

import { useActionState, useState } from "react";
import {
  createReviewAction,
  type ReviewFormState,
} from "@/app/[lang]/products/actions";
import { FieldErrors } from "@/components/admin/form-controls";
import { REVIEW_AUTHOR_EMAIL_MAX, REVIEW_AUTHOR_NAME_MAX, REVIEW_BODY_MAX } from "@my-ecommerce/shared";
import type { Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/languages";
import { StarPicker } from "./star-picker";

/**
 * The design's "Add a review" panel (Figma 178:3132), in the storefront's
 * luxury register — dressed as the contact and account forms are: the note,
 * the star row, name and email side by side, the review box, and the button.
 *
 * ## Why every field is controlled
 *
 * React 19 resets a form when its action resolves — including when it resolves
 * with a refusal — so an uncontrolled box comes back empty exactly when a
 * person most needs what they typed kept. The admin's product form documents
 * the same trap; this follows it.
 *
 * ## Why the success state replaces the form
 *
 * A review lands `pending`, so there is nothing on the page for it to join yet.
 * Saying so in place of the form is the one state the design does not draw, and
 * it puts the outcome where the person's attention already is — rather than
 * leaving a filled-in form behind a message, which reads as though the submit
 * did not work.
 */
export function ReviewForm({
  productId,
  messages,
  locale,
}: {
  productId: string;
  /** This locale's `reviews.form` slice of the catalog. */
  messages: Messages["reviews"]["form"];
  /**
   * The language this page is being read in, sent with the submission so a
   * review is filed under the language it was written on a page in.
   *
   * A hidden field rather than something the action looks up, because a Server
   * Action cannot read the URL's root segment — it is not a render of a route,
   * it is a POST to one. See `createReview`, which decides what the field is
   * worth.
   */
  locale: Locale;
}) {
  const [state, formAction, pending] = useActionState<
    ReviewFormState | undefined,
    FormData
  >(createReviewAction, undefined);

  const [rating, setRating] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [body, setBody] = useState("");

  // After every hook, so the order they run in is the same on both paths.
  if (state?.ok) {
    return (
      <p
        role="status"
        className="border border-line border-l-2 border-l-gold bg-ivory px-[20px] py-[16px] font-display text-[18px] leading-[28px] text-ink"
      >
        {messages.thanks}
      </p>
    );
  }

  const errors = state?.errors;

  return (
    <form action={formAction} className="flex flex-col">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="locale" value={locale} />

      <h2 className="font-display text-[26px] leading-9 font-normal text-ink">
        {messages.title}
      </h2>

      <div className="grid grid-cols-1 gap-x-[20px] gap-y-[24px] pt-[12px] bar:grid-cols-2">
        <p className="text-[14px] leading-[22px] text-ink-55 bar:col-span-2">
          {messages.note}{" "}
          <span aria-hidden className="text-gold">
            *
          </span>
        </p>

        <div className="bar:col-span-2">
          <StarPicker
            value={rating}
            onChange={setRating}
            messages={messages}
            describedBy={errors?.rating ? "rating-error" : undefined}
          />
          <FieldErrors id="rating-error" messages={errors?.rating} announce />
        </div>

        <div>
          <label htmlFor="authorName" className={LABEL}>
            {messages.name}
            <span aria-hidden className="pl-1 text-gold">
              *
            </span>
          </label>
          <input
            id="authorName"
            name="authorName"
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            required
            maxLength={REVIEW_AUTHOR_NAME_MAX}
            autoComplete="name"
            aria-invalid={Boolean(errors?.authorName)}
            aria-describedby={errors?.authorName ? "authorName-error" : undefined}
            className={fieldClass(Boolean(errors?.authorName))}
          />
          <FieldErrors id="authorName-error" messages={errors?.authorName} />
        </div>

        <div>
          <label htmlFor="authorEmail" className={LABEL}>
            {messages.email}
            <span aria-hidden className="pl-1 text-gold">
              *
            </span>
          </label>
          <input
            id="authorEmail"
            name="authorEmail"
            type="email"
            value={authorEmail}
            onChange={(event) => setAuthorEmail(event.target.value)}
            required
            maxLength={REVIEW_AUTHOR_EMAIL_MAX}
            autoComplete="email"
            aria-invalid={Boolean(errors?.authorEmail)}
            aria-describedby={errors?.authorEmail ? "authorEmail-error" : undefined}
            className={fieldClass(Boolean(errors?.authorEmail))}
          />
          <FieldErrors id="authorEmail-error" messages={errors?.authorEmail} />
        </div>

        <div className="bar:col-span-2">
          <label htmlFor="body" className={LABEL}>
            {messages.body}
            <span aria-hidden className="pl-1 text-gold">
              *
            </span>
          </label>
          <textarea
            id="body"
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
            maxLength={REVIEW_BODY_MAX}
            aria-invalid={Boolean(errors?.body)}
            aria-describedby={errors?.body ? "body-error" : undefined}
            className={`${fieldClass(Boolean(errors?.body))} h-[170px] resize-y py-3`}
          />
          <FieldErrors id="body-error" messages={errors?.body} />
        </div>

        {/* The design leaves a blank row above the button; the padding is that
            row plus the grid's own gap, without an empty grid item. */}
        <div className="bar:col-span-2 pt-[32px]">
          {state?.message && (
            <p
              role="alert"
              aria-live="polite"
              className="mb-[20px] border border-danger px-[15px] py-[8px] text-[14px] leading-[23.1px] text-danger"
            >
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-[46px] items-center justify-center border border-ink bg-ink px-8 text-[13px] leading-5 font-medium tracking-[0.14em] text-paper transition-colors duration-300 hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-ink disabled:hover:text-paper"
          >
            {pending ? messages.sending : messages.submit}
          </button>
        </div>
      </div>
    </form>
  );
}

/** The contact form's label: small tracked capitals, with a gold asterisk. */
const LABEL =
  "block pb-2 text-[11px] leading-4 font-medium tracking-[0.18em] text-ink-55 uppercase";

/**
 * The contact form's box: square, 46px tall, one hairline border that turns
 * to ink on focus and to the danger red when the field was refused — which is
 * why `form-controls`' `inputClass` is not the one here.
 */
function fieldClass(invalid: boolean): string {
  return `h-[46px] w-full border bg-paper px-[15px] text-[16px] text-ink outline-none transition-colors focus:border-ink ${
    invalid ? "border-danger" : "border-line"
  }`;
}
