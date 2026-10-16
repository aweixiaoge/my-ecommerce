"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createBlogCategoryAction,
  type BlogCategoryFormState,
} from "@/app/admin/(shell)/blog-categories/actions";
import { FieldErrors, inputClass, LABEL } from "./form-controls";

/**
 * The create-blog-category form.
 *
 * A sibling of `CategoryForm` rather than a mode of it: the two screens post to
 * different actions and lead back to different lists, and what they share is a
 * label, an input and a message — a component parameterised over three things
 * would be a component with three ways to be wrong.
 *
 * A Client Component for the same reason the others are: `useActionState` is
 * what carries the server's validation result back into the markup, so a
 * refused name is answered next to the box it was typed into rather than as a
 * page of its own.
 *
 * The one field is controlled on purpose. React 19 calls `form.reset()` when an
 * action resolves, and this input is `required` — so an uncontrolled version
 * comes back empty after a refused submit *and* then refuses the next one
 * without firing it, which reads as a broken button and has lost what was
 * typed.
 */
export function BlogCategoryForm() {
  const [state, formAction, pending] = useActionState<
    BlogCategoryFormState | undefined,
    FormData
  >(createBlogCategoryAction, undefined);

  const [name, setName] = useState("");

  return (
    <form action={formAction} className="flex max-w-[640px] flex-col gap-8">
      {state?.message && (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-control border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] leading-[21.45px] text-red-700"
        >
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="name" className={LABEL}>
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={state?.errors?.name ? true : undefined}
          aria-describedby={state?.errors?.name ? "name-error" : undefined}
          className={inputClass(Boolean(state?.errors?.name))}
        />
        <FieldErrors id="name-error" messages={state?.errors?.name} />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-control bg-ink px-5 text-[14px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create blog category"}
        </button>

        <Link
          href="/admin/blog-categories"
          className="flex h-11 items-center rounded-control border border-line px-4 text-[14px] font-medium text-ink transition-colors hover:bg-mist"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
