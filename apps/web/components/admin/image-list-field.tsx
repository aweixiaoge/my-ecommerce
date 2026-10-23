"use client";

import { useState } from "react";
import { ACCEPTED_IMAGE_TYPES } from "@my-ecommerce/shared";
import { uploadMedia } from "@/lib/admin/upload-media";
import { mediaUrl, planUploads } from "@/lib/admin/product-media";
import { addMediaId, moveMediaId, removeMediaId } from "@/lib/admin/product-variants";
import { FieldErrors, LABEL } from "./form-controls";

/**
 * One ordered list of images, uploaded the moment they are chosen — the
 * product form's picker with the colour row taken out from around it, as the
 * blog form and the About screen use it.
 *
 * Split in two: `useImageList` holds the ids and the uploads in flight, so the
 * form above can wait for them before it submits; `ImageListField` draws the
 * thumbnails, the file input and the hidden field the ids travel in. Position
 * zero is the Main image.
 */

/** What is on its way up, and what came back refused. */
interface UploadState {
  pending: number;
  problems: string[];
}

const NO_UPLOADS: UploadState = { pending: 0, problems: [] };

export interface ImageList {
  mediaIds: readonly string[];
  setMediaIds: (update: (current: readonly string[]) => readonly string[]) => void;
  uploads: UploadState;
  /**
   * Whether an image is still on its way.
   *
   * The hidden field is built from state, so submitting mid-upload would send
   * the ids that had arrived and none of the others — and the save would go
   * through, and the page change, before anyone could tell. Waiting is the
   * honest option: the ids are not known yet.
   */
  uploading: boolean;
  limit: number;
  addImages: (files: File[]) => Promise<void>;
}

export function useImageList({
  initial,
  limit,
  holder,
}: {
  initial: readonly string[];
  limit: number;
  /** What holds the images, for the refusal copy: "a blog post", "the About page". */
  holder: string;
}): ImageList {
  const [mediaIds, setMediaIds] = useState<readonly string[]>(initial);
  const [uploads, setUploads] = useState<UploadState>(NO_UPLOADS);

  /** Counts an upload in or out, so the field can say how many are still going. */
  function bumpPending(delta: number) {
    setUploads((current) => ({
      ...current,
      pending: Math.max(0, current.pending + delta),
    }));
  }

  function addUploadProblem(problem: string) {
    setUploads((current) => ({
      ...current,
      problems: [...current.problems, problem],
    }));
  }

  /**
   * Uploads the files that were chosen, one request each.
   *
   * Sequentially rather than all at once: a batch of photographs is bounded by
   * the connection, and firing six requests at a dev server to watch them
   * arrive in a different order than they were picked is worse than waiting.
   * Each id is appended as it comes back, so the order on the screen is the
   * order the files were chosen.
   */
  async function addImages(files: File[]) {
    // Still-in-flight uploads count against the cap, because the ids they will
    // bring back are already spoken for. Counting only what has arrived lets a
    // second selection take the list past the limit, and the refusal then lands
    // on the submit button rather than on the file that was one too many.
    const room = limit - mediaIds.length - uploads.pending;
    const { accepted, problems } = planUploads(files, room, { holder, limit });

    // Replaced, not appended: what is shown is about the selection just made,
    // and yesterday's rejection is not news.
    setUploads((current) => ({ ...current, problems }));

    if (accepted.length === 0) return;

    bumpPending(accepted.length);

    for (const file of accepted) {
      try {
        const result = await uploadMedia(file);

        if (result.ok) {
          setMediaIds((current) => addMediaId(current, result.media.id));
        } else {
          addUploadProblem(result.message);
        }
      } catch {
        // A request that never came back — the dev server restarted, the
        // connection dropped — is still a file that did not upload. The action
        // returns its refusals as messages precisely so this path is rare; the
        // catch is here so that when it happens the field says so instead of
        // sitting on "Uploading…" for the rest of the session.
        addUploadProblem("That upload did not finish. Try again.");
      } finally {
        bumpPending(-1);
      }
    }
  }

  return {
    mediaIds,
    setMediaIds,
    uploads,
    uploading: uploads.pending > 0,
    limit,
    addImages,
  };
}

export function ImageListField({
  list,
  errors,
  heading = "Images",
}: {
  list: ImageList;
  /** The action's refusals for the `mediaIds` field. */
  errors?: string[];
  heading?: string;
}) {
  const { mediaIds, setMediaIds, uploads, limit, addImages } = list;
  const full = mediaIds.length >= limit;

  return (
    <section className="flex flex-col gap-3">
      <h2 className={LABEL}>{heading}</h2>

      {mediaIds.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {mediaIds.map((id, index) => (
            <li key={id} className="w-[104px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(id)}
                // Empty and decorative: the buttons below name what each
                // image is in the order, and describing the same photograph
                // six times helps nobody.
                alt=""
                className="h-[72px] w-[104px] rounded-control border border-line object-cover"
              />

              <div className="mt-1 flex items-center gap-1">
                <ImageButton
                  label={`Move image ${index + 1} earlier`}
                  disabled={index === 0}
                  onClick={() => setMediaIds((current) => moveMediaId(current, id, -1))}
                >
                  ←
                </ImageButton>
                <ImageButton
                  label={`Move image ${index + 1} later`}
                  disabled={index === mediaIds.length - 1}
                  onClick={() => setMediaIds((current) => moveMediaId(current, id, 1))}
                >
                  →
                </ImageButton>
                <ImageButton
                  label={`Remove image ${index + 1}`}
                  onClick={() => setMediaIds((current) => removeMediaId(current, id))}
                >
                  ×
                </ImageButton>
                {index === 0 && (
                  <span className="ml-auto text-[11px] leading-[18.15px] text-ink-55">Main</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="images" className="text-[12px] leading-[19.8px] text-ink-62">
          Add images
        </label>
        <input
          id="images"
          type="file"
          multiple
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          disabled={full}
          // Deliberately nameless: a named file input would have React copy
          // the chosen Files into the submitted form *as well as* the ids
          // below, which is the whole payload this design avoids.
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            // Cleared so choosing the same file again still fires a change —
            // a file input that keeps its value reports nothing the second
            // time.
            event.target.value = "";
            addImages(files);
          }}
          className="text-[12px] leading-[19.8px] text-ink-62 file:mr-2 file:h-8 file:rounded-control file:border file:border-line file:bg-paper file:px-3 file:text-[12px] file:font-medium file:text-ink hover:file:bg-mist disabled:opacity-50"
        />

        {full && (
          <p className="text-[12px] leading-[19.8px] text-ink-55">
            {limit} images is the limit — remove one to add another.
          </p>
        )}
        {uploads.pending > 0 && (
          <p aria-live="polite" className="text-[12px] leading-[19.8px] text-ink-55">
            Uploading {uploads.pending}…
          </p>
        )}
        {uploads.problems.length > 0 && (
          <ul role="alert" className="text-[12px] leading-[19.8px] text-red-600">
            {uploads.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}
        <FieldErrors id="media-ids-error" messages={errors} announce />
      </div>

      {/*
        The ids of the uploads, in the order shown. The files themselves were
        sent one request each the moment they were chosen — this is what the
        save claims them by.
      */}
      <input type="hidden" name="mediaIds" value={JSON.stringify(mediaIds)} />
    </section>
  );
}

/** One of the thumbnail's small move-or-remove controls. */
function ImageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="h-6 w-6 rounded-[3px] border border-line bg-paper text-[12px] leading-none text-ink transition-colors hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
