"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  ACCEPTED_IMAGE_TYPES,
  IMAGES_PER_BLOG_MAX,
} from "@my-ecommerce/shared";
import {
  createBlogAction,
  type BlogFormState,
} from "@/app/admin/(shell)/blogs/actions";
import { uploadMediaAction } from "@/app/admin/media/actions";
import { mediaUrl, planUploads } from "@/lib/admin/product-media";
import {
  addMediaId,
  moveMediaId,
  removeMediaId,
} from "@/lib/admin/product-variants";
import { DescriptionEditor } from "./description-editor";
import { FieldErrors, inputClass, LABEL } from "./form-controls";

/**
 * The create-blog form.
 *
 * A Client Component for the two reasons the product form is one: the
 * description editor's preview has to be immediate, and an image is uploaded
 * the moment it is chosen — the ids are what the form actually submits, so they
 * cannot live anywhere but React state.
 *
 * The images are one list on the post rather than a set per row, which is where
 * this differs from the product form: a post has no variants to hang them off,
 * so the picker is the same picker with the colour row taken out from around
 * it. Position zero is the Main image — and, when the storefront's journal
 * arrives, the post's cover.
 */

/** What is on its way up, and what came back refused. */
interface UploadState {
  pending: number;
  problems: string[];
}

const NO_UPLOADS: UploadState = { pending: 0, problems: [] };

export function BlogForm({
  categories,
}: {
  /**
   * Every blog category, in the order the Category screen shows them. Passed in
   * rather than fetched here: this is a Client Component, and the page above it
   * is already reading the database.
   */
  categories: readonly { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<
    BlogFormState | undefined,
    FormData
  >(createBlogAction, undefined);

  /*
   * Every field is controlled, for the reason the product form's are: React 19
   * calls `form.reset()` when an action resolves, so an uncontrolled `required`
   * input comes back empty after a refused submit — and then refuses the next
   * one without firing it, which reads as a broken button and has lost what was
   * typed.
   */
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [mediaIds, setMediaIds] = useState<readonly string[]>([]);
  const [uploads, setUploads] = useState<UploadState>(NO_UPLOADS);

  /**
   * Whether an image is still on its way.
   *
   * The hidden field is built from state, so submitting mid-upload would send
   * the ids that had arrived and none of the others — and the post would be
   * saved, and the page changed, before anyone could tell. Waiting is the
   * honest option: the ids are not known yet.
   */
  const uploading = uploads.pending > 0;
  const full = mediaIds.length >= IMAGES_PER_BLOG_MAX;

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
    const room = IMAGES_PER_BLOG_MAX - mediaIds.length - uploads.pending;
    const { accepted, problems } = planUploads(files, room, {
      holder: "a blog post",
      limit: IMAGES_PER_BLOG_MAX,
    });

    // Replaced, not appended: what is shown is about the selection just made,
    // and yesterday's rejection is not news.
    setUploads((current) => ({ ...current, problems }));

    if (accepted.length === 0) return;

    bumpPending(accepted.length);

    for (const file of accepted) {
      try {
        const result = await uploadMediaAction(file);

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
        <label htmlFor="title" className={LABEL}>
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={state?.errors?.title ? true : undefined}
          aria-describedby={state?.errors?.title ? "title-error" : undefined}
          className={inputClass(Boolean(state?.errors?.title))}
        />
        <FieldErrors id="title-error" messages={state?.errors?.title} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="shortDescription" className={LABEL}>
          Short description
        </label>
        <input
          id="shortDescription"
          name="shortDescription"
          type="text"
          value={shortDescription}
          onChange={(event) => setShortDescription(event.target.value)}
          aria-invalid={state?.errors?.shortDescription ? true : undefined}
          aria-describedby={
            state?.errors?.shortDescription
              ? "short-description-error"
              : undefined
          }
          className={inputClass(Boolean(state?.errors?.shortDescription))}
        />
        <p className="text-[12px] leading-[19.8px] text-ink-55">
          One line, for the card and the listing.
        </p>
        <FieldErrors
          id="short-description-error"
          messages={state?.errors?.shortDescription}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="categoryId" className={LABEL}>
          Category
        </label>
        <select
          id="categoryId"
          name="categoryId"
          required
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          aria-invalid={state?.errors?.categoryId ? true : undefined}
          aria-describedby={
            state?.errors?.categoryId ? "category-id-error" : undefined
          }
          className={inputClass(Boolean(state?.errors?.categoryId))}
        >
          {/*
            Disabled, so it is not a choice once a category has been picked —
            and empty, which is what makes `required` mean something: a select
            whose value is the empty string fails the browser's own validation,
            so the form cannot be sent without answering. The server refuses it
            too (`min(1)`), because a Server Action is reachable by direct POST
            and the browser's check is feedback rather than enforcement.
          */}
          <option value="" disabled>
            Choose a category
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        {/*
          A required field and an empty database is a dead end, so it says why
          instead: a browser refusing the submit with "please select an item"
          when there is no item to select is a riddle, not a message.
        */}
        {categories.length === 0 && (
          <p className="text-[12px] leading-[19.8px] text-ink-55">
            No categories yet.{" "}
            <Link
              href="/admin/blog-categories/new"
              className="underline transition-colors hover:text-ink"
            >
              Create one
            </Link>{" "}
            and it will appear here.
          </p>
        )}

        <FieldErrors id="category-id-error" messages={state?.errors?.categoryId} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className={LABEL}>Images</h2>

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
                    onClick={() =>
                      setMediaIds((current) => moveMediaId(current, id, -1))
                    }
                  >
                    ←
                  </ImageButton>
                  <ImageButton
                    label={`Move image ${index + 1} later`}
                    disabled={index === mediaIds.length - 1}
                    onClick={() =>
                      setMediaIds((current) => moveMediaId(current, id, 1))
                    }
                  >
                    →
                  </ImageButton>
                  <ImageButton
                    label={`Remove image ${index + 1}`}
                    onClick={() =>
                      setMediaIds((current) => removeMediaId(current, id))
                    }
                  >
                    ×
                  </ImageButton>
                  {index === 0 && (
                    <span className="ml-auto text-[11px] leading-[18.15px] text-ink-55">
                      Main
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="images"
            className="text-[12px] leading-[19.8px] text-ink-62"
          >
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
              {IMAGES_PER_BLOG_MAX} images is the limit — remove one to add
              another.
            </p>
          )}
          {uploads.pending > 0 && (
            <p
              aria-live="polite"
              className="text-[12px] leading-[19.8px] text-ink-55"
            >
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
          <FieldErrors
            id="media-ids-error"
            messages={state?.errors?.mediaIds}
            announce
          />
        </div>

        {/*
          The ids of the uploads, in the order shown. The files themselves were
          sent one request each the moment they were chosen — this is what the
          create action claims them by.
        */}
        <input type="hidden" name="mediaIds" value={JSON.stringify(mediaIds)} />
      </section>

      <DescriptionEditor
        value={description}
        onChange={setDescription}
        messages={state?.errors?.description}
        placeholder={"## First impressions\n\n- What surprised me\n- **Who it is for**"}
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          // The last term is the required category with nothing to pick: the
          // field's hint says what to do about it, and a button that refuses
          // without saying why is worse than one that is off.
          disabled={pending || uploading || categories.length === 0}
          className="h-11 rounded-control bg-ink px-5 text-[14px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create blog"}
        </button>

        {uploading && (
          <p
            aria-live="polite"
            className="text-[12px] leading-[19.8px] text-ink-55"
          >
            Waiting for the images to finish uploading.
          </p>
        )}

        <Link
          href="/admin/blogs"
          className="flex h-11 items-center rounded-control border border-line px-4 text-[14px] font-medium text-ink transition-colors hover:bg-mist"
        >
          Cancel
        </Link>
      </div>
    </form>
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
