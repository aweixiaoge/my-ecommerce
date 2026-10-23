"use client";

import { startTransition, useActionState, useState } from "react";
import { saveFaqAction, type FaqFormState } from "@/app/admin/(shell)/contact-faq/actions";
import { translationNoticeText } from "@/lib/admin/translation-notice";
import { DescriptionEditor } from "./description-editor";

/**
 * The Contact → FAQ form: one markdown description, in the same editor the
 * product and blog forms use, so its preview is exactly what the storefront's
 * FAQ page draws.
 *
 * Controlled, and submitted through `onSubmit`, for the coupon form's reason:
 * React 19 resets a form when its action resolves, and this one has to keep
 * showing what was saved.
 */
export function FaqForm({ description: initial }: { description: string }) {
  const [state, formAction, pending] = useActionState<FaqFormState | undefined, FormData>(
    saveFaqAction,
    undefined,
  );
  const [description, setDescription] = useState(initial);
  // The notice is about the text it saved; an edit after it makes it a claim
  // about something else.
  const [dirty, setDirty] = useState(false);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setDirty(false);
        startTransition(() => formAction(formData));
      }}
      className="flex max-w-[860px] flex-col gap-6"
    >
      {state?.message && (
        <p
          role="alert"
          className="rounded-control border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] leading-[21.45px] text-red-700"
        >
          {state.message}
        </p>
      )}

      <DescriptionEditor
        value={description}
        onChange={(value) => {
          setDescription(value);
          setDirty(true);
        }}
        messages={state?.errors?.description}
        placeholder={"## Shipping\n\n**How long does delivery take?**\n\nMost orders arrive in 3–5 working days."}
      />

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-control bg-ink px-6 text-[14px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {/* Saving includes the translation pass, which takes a few seconds. */}
          {pending ? "Saving and translating…" : "Save"}
        </button>
        <p role="status" className="text-[13px] text-ink-60">
          {state?.translated && !dirty && !pending ? translationNoticeText(state.translated) : ""}
        </p>
      </div>
    </form>
  );
}
