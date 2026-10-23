"use client";

import { startTransition, useActionState, useState } from "react";
import { IMAGES_PER_ABOUT_MAX } from "@my-ecommerce/shared";
import { saveAboutAction, type AboutFormState } from "@/app/admin/(shell)/contact-about/actions";
import { translationNoticeText } from "@/lib/admin/translation-notice";
import { DescriptionEditor } from "./description-editor";
import { ImageListField, useImageList } from "./image-list-field";

/**
 * The Contact → About form: the page's images, in the picker the product and
 * blog forms use, and one markdown description in their editor — so its
 * preview is what the storefront's About page draws.
 *
 * Controlled, and submitted through `onSubmit`, for the FAQ form's reason:
 * React 19 resets a form when its action resolves, and this one has to keep
 * showing what was saved.
 */
export function AboutForm({
  description: initialDescription,
  mediaIds: initialMediaIds,
}: {
  description: string;
  mediaIds: readonly string[];
}) {
  const [state, formAction, pending] = useActionState<AboutFormState | undefined, FormData>(
    saveAboutAction,
    undefined,
  );
  const [description, setDescription] = useState(initialDescription);
  const images = useImageList({
    initial: initialMediaIds,
    limit: IMAGES_PER_ABOUT_MAX,
    holder: "the About page",
  });
  // The notice is about what it saved; an edit after it makes it a claim about
  // something else.
  const [dirty, setDirty] = useState(false);
  const [savedIds, setSavedIds] = useState(initialMediaIds);
  const changed = dirty || savedIds !== images.mediaIds;

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setDirty(false);
        setSavedIds(images.mediaIds);
        startTransition(() => formAction(formData));
      }}
      className="flex max-w-[860px] flex-col gap-8"
    >
      {state?.message && (
        <p
          role="alert"
          className="rounded-control border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] leading-[21.45px] text-red-700"
        >
          {state.message}
        </p>
      )}

      <ImageListField list={images} errors={state?.errors?.mediaIds} />

      <DescriptionEditor
        value={description}
        onChange={(value) => {
          setDescription(value);
          setDirty(true);
        }}
        messages={state?.errors?.description}
        placeholder={"## Who we are\n\nWe test every pair of headphones before it reaches the shop."}
      />

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending || images.uploading}
          className="h-11 rounded-control bg-ink px-6 text-[14px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {/* Saving includes the translation pass, which takes a few seconds. */}
          {pending ? "Saving and translating…" : "Save"}
        </button>
        <p role="status" className="text-[13px] text-ink-60">
          {images.uploading
            ? "Waiting for the images to finish uploading."
            : state?.translated && !changed && !pending
              ? translationNoticeText(state.translated)
              : ""}
        </p>
      </div>
    </form>
  );
}
