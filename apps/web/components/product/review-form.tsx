"use client";

import { useActionState, useState } from "react";
import {
  createReviewAction,
  type ReviewFormState,
} from "@/app/(storefront)/products/actions";
import { FieldErrors } from "@/components/admin/form-controls";
import { REVIEW_AUTHOR_EMAIL_MAX, REVIEW_AUTHOR_NAME_MAX, REVIEW_BODY_MAX } from "@my-ecommerce/shared";
import { StarPicker } from "./star-picker";

/**
 * The design's "Add a review" panel (Figma 178:3132): the note, the star row,
 * name and email side by side, the review box, and the button.
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
export function ReviewForm({ productId }: { productId: string }) {
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
        className="text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink"
      >
        Thanks — your review is with us. It will appear here once it has been
        approved.
      </p>
    );
  }

  const errors = state?.errors;

  return (
    <form action={formAction} className="flex flex-col">
      <input type="hidden" name="productId" value={productId} />

      <h2 className="text-[16px] leading-[26.4px] font-bold tracking-[-0.3125px] text-ink">
        Add a review
      </h2>

      <div className="grid grid-cols-1 gap-x-[20px] gap-y-[24px] pt-[10px] bar:grid-cols-2">
        <p className="text-[13px] leading-[21.45px] tracking-[-0.076px] text-ink bar:col-span-2">
          Your email address will not be published. Required fields are marked{" "}
          <span aria-hidden className="text-[#cc0000]">
            *
          </span>
        </p>

        <div className="bar:col-span-2">
          <StarPicker
            value={rating}
            onChange={setRating}
            describedBy={errors?.rating ? "rating-error" : undefined}
          />
          <FieldErrors id="rating-error" messages={errors?.rating} announce />
        </div>

        <div>
          <label htmlFor="authorName" className={LABEL}>
            Name
            <span aria-hidden className="text-[#cc0000]">
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
            Email
            <span aria-hidden className="text-[#cc0000]">
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
            Your review
            <span aria-hidden className="text-[#cc0000]">
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
            className={`${fieldClass(Boolean(errors?.body))} h-[170px] resize-y py-2`}
          />
          <FieldErrors id="body-error" messages={errors?.body} />
        </div>

        {/* The design leaves a blank row above the button; the padding is that
            row plus the grid's own gap, without an empty grid item. */}
        <div className="bar:col-span-2 pt-[26px]">
          {state?.message && (
            <p
              role="alert"
              aria-live="polite"
              className="mb-[12px] rounded-control border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700"
            >
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="h-10 w-[90px] rounded-control bg-ink text-[15px] leading-[24.75px] font-medium tracking-[-0.234375px] text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Sending…" : "Submit"}
          </button>
        </div>
      </div>
    </form>
  );
}

/** The design's field label: 15px, with its asterisk in the required red. */
const LABEL =
  "block pb-[7.5px] text-[15px] leading-[24.75px] tracking-[-0.234375px] text-ink";

/**
 * The design's input: 40px tall, 3px radius, one hairline border — with the
 * same red-on-invalid treatment the admin's fields use and a different type
 * scale, which is why `form-controls`' `inputClass` is not the one here.
 */
function fieldClass(invalid: boolean): string {
  return `w-full rounded-control border bg-paper px-3 text-[15px] leading-[24.75px] tracking-[-0.234375px] text-ink transition-colors outline-none focus:ring-2 ${
    invalid
      ? "border-red-500 focus:border-red-500 focus:ring-red-500/15"
      : "border-line focus:border-ink focus:ring-ink/15"
  }`;
}
