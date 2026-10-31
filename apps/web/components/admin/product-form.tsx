"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  IMAGES_PER_VARIANT_MAX,
} from "@my-ecommerce/shared";
import {
  createProductAction,
  updateProductAction,
  type ProductFormState,
} from "@/app/admin/(shell)/products/actions";
import { uploadMedia } from "@/lib/admin/upload-media";
import { toFormAttributes, toFormDrafts } from "@/lib/admin/product-edit";
import { mediaUrl, planUploads } from "@/lib/admin/product-media";
import type { ProductForEdit } from "@/lib/admin/products-repo";
import {
  addMediaId,
  colorKey,
  draftFor,
  draftProblems,
  hasProblems,
  moveMediaId,
  removeMediaId,
  serializeVariants,
  type FormColorDraft,
} from "@/lib/admin/product-variants";
import {
  ATTRIBUTE_LABELS,
  ATTRIBUTE_PLACEHOLDERS,
  availableKinds,
  nextAvailableKind,
  parseAttributeValues,
  serializeAttributes,
  type FormAttribute,
} from "@/lib/admin/product-form";
import { DescriptionEditor } from "./description-editor";
import { FieldErrors, inputClass, LABEL } from "./form-controls";
import { VideoThumbnail } from "./video-thumbnail";

/** What is happening to one colour's images right now. */
interface UploadState {
  /** Uploads still in flight, so the row can say so rather than look stuck. */
  pending: number;
  problems: string[];
}

const NO_UPLOADS: UploadState = { pending: 0, problems: [] };

/**
 * What is happening to a colour's images, blank if nothing ever has.
 *
 * `Object.hasOwn` for the same reason `draftFor` uses it: the key is a colour
 * someone typed, and `uploads["constructor"]` on a plain object finds an
 * inherited value rather than nothing.
 */
function uploadStateFor(
  uploads: Record<string, UploadState>,
  color: string,
): UploadState {
  const key = colorKey(color);
  return Object.hasOwn(uploads, key) ? uploads[key]! : NO_UPLOADS;
}

/**
 * The product form — the same one for creating and for editing.
 *
 * A Client Component because the description editor, the attribute rows and the
 * per-colour rows are all interactive before anything is submitted — a preview
 * that needs a round trip to the server would show the author their copy a
 * second late, and a list of colours is edited long before the form is sent.
 * The rules are all elsewhere: the shared schema decides what is valid,
 * `lib/admin/product-form` decides what is typed, `lib/admin/product-variants`
 * decides what a colour's price and stock mean, and this file decides where it
 * sits on the screen.
 *
 * Handed a product, it edits it. That is the whole difference: the same fields
 * in the same order, seeded from `lib/admin/product-edit`, posting to the action
 * that writes over a row instead of the one that makes a new one. A second
 * screen with its own layout would be a second screen to keep in step, and the
 * first thing to fall out of step would be the fields it forgot to show.
 */
export function ProductForm({
  product,
  categories,
}: {
  product?: ProductForEdit;
  /**
   * Every category in the catalogue, in the order the Category screen shows
   * them. Passed in rather than fetched here: this is a Client Component, and
   * the page above it is already reading the database.
   */
  categories: readonly { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<
    ProductFormState | undefined,
    FormData
  >(product ? updateProductAction : createProductAction, undefined);

  const [description, setDescription] = useState(product?.description ?? "");
  const [attributes, setAttributes] = useState<FormAttribute[]>(() =>
    product ? toFormAttributes(product.attributes) : [],
  );
  const [drafts, setDrafts] = useState<Record<string, FormColorDraft>>(() =>
    product ? toFormDrafts(product.variants) : {},
  );
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  // Which of the ids are videos: the thumbnail is a `<video>` for those, and an
  // id alone cannot say. Seeded from the stored product, grown by each upload.
  const [videoIds, setVideoIds] = useState<ReadonlySet<string>>(
    () => new Set(product?.videoIds ?? []),
  );

  /*
   * Every field on this form is controlled, including the two plain ones.
   *
   * The tempting alternative — leave them uncontrolled and let the DOM hold
   * them — does not survive a failed submit. React 19 calls `form.reset()` when
   * a form action resolves, so an uncontrolled Name comes back empty; and
   * because it is `required`, the browser then refuses the next submit without
   * firing one, so the button reads as broken and the copy is gone. Keeping the
   * value in React state is the only version where a refused submission leaves
   * the form as it was.
   */
  const [name, setName] = useState(product?.name ?? "");
  const [shortDescription, setShortDescription] = useState(
    product?.shortDescription ?? "",
  );
  // Seeded from the product, so editing one shows the category it is already
  // in. A product stored before the field existed has none, and the placeholder
  // is what it opens on — a save then asks the question rather than guessing.
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const nextKind = nextAvailableKind(attributes);
  const editing = product !== undefined;

  const colors = parseAttributeValues(
    attributes.find((attribute) => attribute.kind === "color")?.values ?? "",
  );

  /**
   * Whether every declared colour's row says something sensible.
   *
   * The submit button reads this. A price of "abc" is not sent and not stored —
   * it is refused before the request, next to the box it was typed into, which
   * is the only place a person can act on it.
   */
  const blocked = hasProblems(drafts, colors);

  /**
   * Whether an image is still on its way.
   *
   * The hidden field is built from state, so submitting mid-upload would send
   * the ids that had arrived and none of the others — and the product would be
   * saved, and the page changed, before anyone could tell. Waiting is the
   * honest option: the ids are not known yet.
   */
  const uploading = Object.values(uploads).some((upload) => upload.pending > 0);

  function addAttribute() {
    if (!nextKind) return;
    setAttributes((current) => [...current, { kind: nextKind, values: "" }]);
  }

  function updateAttribute(index: number, patch: Partial<FormAttribute>) {
    setAttributes((current) =>
      current.map((attribute, i) =>
        i === index ? { ...attribute, ...patch } : attribute,
      ),
    );
  }

  function removeAttribute(index: number) {
    setAttributes((current) => current.filter((_, i) => i !== index));
  }

  function patchDraft(color: string, patch: Partial<FormColorDraft>) {
    setDrafts((current) => {
      const key = colorKey(color);
      return { ...current, [key]: { ...draftFor(current, color), ...patch } };
    });
  }

  function setUploadState(color: string, patch: Partial<UploadState>) {
    setUploads((current) => {
      const key = colorKey(color);
      return {
        ...current,
        [key]: { ...uploadStateFor(current, color), ...patch },
      };
    });
  }

  /** Counts an upload in or out, so the row can say how many are still going. */
  function bumpPending(color: string, delta: number) {
    setUploads((current) => {
      const key = colorKey(color);
      const upload = uploadStateFor(current, color);
      return {
        ...current,
        [key]: { ...upload, pending: Math.max(0, upload.pending + delta) },
      };
    });
  }

  function addUploadProblem(color: string, problem: string) {
    setUploads((current) => {
      const key = colorKey(color);
      const upload = uploadStateFor(current, color);
      return {
        ...current,
        [key]: { ...upload, problems: [...upload.problems, problem] },
      };
    });
  }

  /**
   * Uploads the files that were chosen, one request each.
   *
   * Sequentially rather than all at once: a batch of photographs is bounded by
   * the connection, and firing six requests at a dev server to watch them
   * arrive in a different order than they were picked is worse than waiting.
   * Each id is appended as it comes back, so the order in the row is the order
   * the files were chosen.
   */
  async function addImages(color: string, files: File[]) {
    // Still-in-flight uploads count against the cap, because the ids they will
    // bring back are already spoken for. Counting only what has arrived lets a
    // second selection take the row past the limit, and the refusal then lands
    // on the submit button rather than on the file that was one too many.
    const room =
      IMAGES_PER_VARIANT_MAX -
      draftFor(drafts, color).mediaIds.length -
      uploadStateFor(uploads, color).pending;
    const { accepted, problems } = planUploads(files, room, { video: true });

    // Replaced, not appended: what is shown is about the selection just made,
    // and yesterday's rejection is not news.
    setUploadState(color, { problems });

    if (accepted.length === 0) return;

    bumpPending(color, accepted.length);

    for (const file of accepted) {
      try {
        const result = await uploadMedia(file);

        if (result.ok) {
          if (result.media.kind === "video") {
            setVideoIds((current) => new Set(current).add(result.media.id));
          }
          setDrafts((current) => {
            const draft = draftFor(current, color);
            return {
              ...current,
              [colorKey(color)]: {
                ...draft,
                mediaIds: addMediaId(draft.mediaIds, result.media.id),
              },
            };
          });
        } else {
          addUploadProblem(color, result.message);
        }
      } catch {
        // A request that never came back — the dev server restarted, the
        // connection dropped — is still a file that did not upload. The action
        // returns its refusals as messages precisely so this path is rare; the
        // catch is here so that when it happens the row says so instead of
        // sitting on "Uploading…" for the rest of the session.
        addUploadProblem(color, "That upload did not finish. Try again.");
      } finally {
        bumpPending(color, -1);
      }
    }
  }

  return (
    <form action={formAction} className="flex max-w-[640px] flex-col gap-8">
      {/* Which product is being written over. Absent when this is a create, and
          its absence is what the action checks before it looks for a row. */}
      {product && <input type="hidden" name="id" value={product.id} />}

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
            state?.errors?.shortDescription ? "short-description-error" : undefined
          }
          className={inputClass(Boolean(state?.errors?.shortDescription))}
        />
        <p className="text-[12px] leading-[19.8px] text-ink-55">
          One line, for cards and listings.
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
              href="/admin/categories/new"
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
        <div className="flex items-center justify-between">
          <h2 className={LABEL}>Attributes</h2>
          <button
            type="button"
            onClick={addAttribute}
            disabled={!nextKind}
            className="h-9 rounded-control border border-line px-3 text-[13px] font-medium text-ink transition-colors hover:bg-mist disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add attribute
          </button>
        </div>

        {attributes.length === 0 ? (
          <p className="text-[12px] leading-[19.8px] text-ink-55">
            Color and Size are the attributes a variant is built from (plan.md,
            data model). Add one to offer this product in options.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {attributes.map((attribute, index) => (
              <li
                // Keyed by position, not by kind: a row whose kind is changed
                // would be remounted under a kind key, and remounting the row
                // takes the focus out of the select the person just used. The
                // values are state, so they survive either way.
                key={index}
                className="flex flex-col gap-3 rounded-card border border-line p-4"
              >
                <div className="flex items-center gap-3">
                  <select
                    aria-label={`Attribute ${index + 1} kind`}
                    value={attribute.kind}
                    onChange={(event) =>
                      updateAttribute(index, {
                        kind: event.target.value as FormAttribute["kind"],
                      })
                    }
                    className="h-9 rounded-control border border-line bg-paper px-2 text-[13px] text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/15"
                  >
                    {availableKinds(attributes, attribute.kind).map((kind) => (
                      <option key={kind} value={kind}>
                        {ATTRIBUTE_LABELS[kind]}
                      </option>
                    ))}
                  </select>

                  <label
                    htmlFor={`attribute-${index}-values`}
                    className="sr-only"
                  >
                    {ATTRIBUTE_LABELS[attribute.kind]} values
                  </label>
                  <input
                    id={`attribute-${index}-values`}
                    type="text"
                    value={attribute.values}
                    onChange={(event) =>
                      updateAttribute(index, { values: event.target.value })
                    }
                    placeholder={ATTRIBUTE_PLACEHOLDERS[attribute.kind]}
                    className={`h-9 flex-1 ${inputClass(false)}`}
                  />

                  <button
                    type="button"
                    onClick={() => removeAttribute(index)}
                    aria-label={`Remove ${ATTRIBUTE_LABELS[attribute.kind]} attribute`}
                    className="h-9 rounded-control px-3 text-[13px] text-ink-62 transition-colors hover:bg-mist hover:text-ink"
                  >
                    Remove
                  </button>
                </div>

                {attribute.kind === "color" ? (
                  <ColorRows
                    colors={parseAttributeValues(attribute.values)}
                    drafts={drafts}
                    uploads={uploads}
                    videoIds={videoIds}
                    onPatch={patchDraft}
                    onPickFiles={(color, files) => void addImages(color, files)}
                    onMove={(color, id, delta) =>
                      patchDraft(color, {
                        mediaIds: moveMediaId(
                          draftFor(drafts, color).mediaIds,
                          id,
                          delta,
                        ),
                      })
                    }
                    onRemove={(color, id) =>
                      patchDraft(color, {
                        mediaIds: removeMediaId(
                          draftFor(drafts, color).mediaIds,
                          id,
                        ),
                      })
                    }
                  />
                ) : (
                  <ValueChips values={parseAttributeValues(attribute.values)} />
                )}
              </li>
            ))}
          </ul>
        )}

        <FieldErrors
          id="attributes-error"
          messages={state?.errors?.attributes}
          // Nobody can focus a hidden input, so this one announces itself
          // rather than being described by the field it belongs to.
          announce
        />

        {/*
          The two fields the form assembles rather than the browser: attributes
          and the colour rows under them are structured, and a form can only
          send strings. Both are drawn from the same state the screen is, so
          what is submitted is what is on show.
        */}
        <input
          type="hidden"
          name="attributes"
          value={serializeAttributes(attributes)}
        />
        <input
          type="hidden"
          name="variants"
          value={serializeVariants(drafts, colors)}
        />

        <FieldErrors
          id="variants-error"
          messages={state?.errors?.variants}
          announce
        />
      </section>

      <DescriptionEditor
        value={description}
        onChange={setDescription}
        messages={state?.errors?.description}
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          // The last term is the required category with nothing to pick: the
          // field's hint says what to do about it, and a button that refuses
          // without saying why is worse than one that is off.
          disabled={pending || blocked || uploading || categories.length === 0}
          className="h-11 rounded-control bg-ink px-5 text-[14px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {editing ? (pending ? "Saving…" : "Save changes") : pending ? "Creating…" : "Create product"}
        </button>

        {uploading && (
          <p aria-live="polite" className="text-[12px] leading-[19.8px] text-ink-55">
            Waiting for the images to finish uploading.
          </p>
        )}

        <Link
          href="/admin/products"
          className="flex h-11 items-center rounded-control border border-line px-4 text-[14px] font-medium text-ink transition-colors hover:bg-mist"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

/**
 * One row per colour, with what that colour ships as.
 *
 * The colour's own name is the row's legend rather than a label on a field:
 * there is nothing to fill in about the name here — it comes from the box above
 * — and repeating it as an input would offer a second place to spell it, which
 * is a second place for the two to disagree.
 */
function ColorRows({
  colors,
  drafts,
  uploads,
  videoIds,
  onPatch,
  onPickFiles,
  onMove,
  onRemove,
}: {
  colors: string[];
  drafts: Record<string, FormColorDraft>;
  uploads: Record<string, UploadState>;
  videoIds: ReadonlySet<string>;
  onPatch: (color: string, patch: Partial<FormColorDraft>) => void;
  onPickFiles: (color: string, files: File[]) => void;
  onMove: (color: string, id: string, delta: number) => void;
  onRemove: (color: string, id: string) => void;
}) {
  if (colors.length === 0) {
    return (
      <p className="text-[12px] leading-[19.8px] text-ink-55">
        Separate values with commas — each colour gets its own images, price,
        stock and SKU.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {colors.map((color) => {
        const draft = draftFor(drafts, color);
        const upload = uploadStateFor(uploads, color);
        const problems = draftProblems(draft);
        const full = draft.mediaIds.length >= IMAGES_PER_VARIANT_MAX;

        return (
          <li key={colorKey(color)}>
            <fieldset className="flex flex-col gap-3 rounded-card bg-mist/40 p-3">
              <legend className="px-1 text-[12px] font-bold leading-[19.8px] text-ink">
                {color}
              </legend>

              <div className="flex flex-wrap gap-3">
                <ColorField
                  id={`${colorKey(color)}-price`}
                  label="Price"
                  value={draft.price}
                  problem={problems.price}
                  className="w-[110px]"
                  onChange={(price) => onPatch(color, { price })}
                />
                <ColorField
                  id={`${colorKey(color)}-stock`}
                  label="Stock"
                  value={draft.stock}
                  problem={problems.stock}
                  className="w-[110px]"
                  onChange={(stock) => onPatch(color, { stock })}
                />
                <ColorField
                  id={`${colorKey(color)}-sku`}
                  label="SKU"
                  value={draft.sku}
                  className="min-w-[160px] flex-1"
                  onChange={(sku) => onPatch(color, { sku })}
                />
              </div>

              {draft.mediaIds.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {draft.mediaIds.map((id, index) => (
                    <li key={id} className="w-[104px]">
                      {videoIds.has(id) ? (
                        <VideoThumbnail src={mediaUrl(id)} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaUrl(id)}
                          // Empty and decorative: the colour's name is already
                          // the legend, and describing the same photograph six
                          // times helps nobody.
                          alt=""
                          className="h-[72px] w-[104px] rounded-control border border-line object-cover"
                        />
                      )}

                      <div className="mt-1 flex items-center gap-1">
                        <ImageButton
                          label={`Move ${color} image ${index + 1} earlier`}
                          disabled={index === 0}
                          onClick={() => onMove(color, id, -1)}
                        >
                          ←
                        </ImageButton>
                        <ImageButton
                          label={`Move ${color} image ${index + 1} later`}
                          disabled={index === draft.mediaIds.length - 1}
                          onClick={() => onMove(color, id, 1)}
                        >
                          →
                        </ImageButton>
                        <ImageButton
                          label={`Remove ${color} image ${index + 1}`}
                          onClick={() => onRemove(color, id)}
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
                  htmlFor={`${colorKey(color)}-images`}
                  className="text-[12px] leading-[19.8px] text-ink-62"
                >
                  Images and videos
                </label>
                <input
                  id={`${colorKey(color)}-images`}
                  type="file"
                  multiple
                  accept={[...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].join(",")}
                  disabled={full}
                  // Deliberately nameless: a named file input would have React
                  // copy the chosen Files into the submitted form *as well as*
                  // the ids below, which is the whole payload this design avoids.
                  onChange={(event) => {
                    const files = [...(event.target.files ?? [])];
                    // Cleared so choosing the same file again still fires a
                    // change — a file input that keeps its value reports
                    // nothing the second time.
                    event.target.value = "";
                    onPickFiles(color, files);
                  }}
                  className="text-[12px] leading-[19.8px] text-ink-62 file:mr-2 file:h-8 file:rounded-control file:border file:border-line file:bg-paper file:px-3 file:text-[12px] file:font-medium file:text-ink hover:file:bg-mist disabled:opacity-50"
                />

                {full && (
                  <p className="text-[12px] leading-[19.8px] text-ink-55">
                    {IMAGES_PER_VARIANT_MAX} images is the limit — remove one to
                    add another.
                  </p>
                )}
                {upload.pending > 0 && (
                  <p
                    aria-live="polite"
                    className="text-[12px] leading-[19.8px] text-ink-55"
                  >
                    Uploading {upload.pending}…
                  </p>
                )}
                {upload.problems.length > 0 && (
                  <ul
                    role="alert"
                    className="text-[12px] leading-[19.8px] text-red-600"
                  >
                    {upload.problems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                )}
              </div>
            </fieldset>
          </li>
        );
      })}
    </ul>
  );
}

function ColorField({
  id,
  label,
  value,
  problem,
  className,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  problem?: string;
  className: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[12px] leading-[19.8px] text-ink-62">
        {label}
      </label>
      <input
        id={id}
        type="text"
        // Controlled, unlike the fields at the top of the form: React resets a
        // form when its action resolves, and an uncontrolled box would come
        // back empty exactly when a failed submit most needs to keep what was
        // typed. The state is also what gets serialised, so there is one copy.
        value={value}
        aria-invalid={problem ? true : undefined}
        aria-describedby={problem ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`h-9 w-full ${inputClass(Boolean(problem))}`}
      />
      {problem && (
        <p id={`${id}-error`} className="text-[11px] leading-[18.15px] text-red-600">
          {problem}
        </p>
      )}
    </div>
  );
}

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

function ValueChips({ values }: { values: string[] }) {
  if (values.length === 0) {
    return (
      <p className="text-[12px] leading-[19.8px] text-ink-55">
        Separate values with commas — each one becomes an option a variant can
        be built from.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <li
          key={value.toLowerCase()}
          className="rounded-control border border-line bg-mist px-2 py-0.5 text-[12px] leading-[19.8px] text-ink"
        >
          {value}
        </li>
      ))}
    </ul>
  );
}

