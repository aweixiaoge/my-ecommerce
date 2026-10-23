"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { IMAGES_PER_BLOG_MAX } from "@my-ecommerce/shared";
import {
  createBlogAction,
  updateBlogAction,
  type BlogFormState,
} from "@/app/admin/(shell)/blogs/actions";
import type { BlogForEdit } from "@/lib/admin/blogs-repo";
import { DescriptionEditor } from "./description-editor";
import { FieldErrors, inputClass, LABEL } from "./form-controls";
import { ImageListField, useImageList } from "./image-list-field";

/**
 * The blog form — the same one for creating and for editing.
 *
 * Handed a post, it edits it, as the product form does: the same fields in the
 * same order, seeded from the post, posting to the update action with the id
 * in a hidden field.
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

export function BlogForm({
  categories,
  blog,
}: {
  /** The post to edit; absent on the create screen. */
  blog?: BlogForEdit;
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
  >(blog ? updateBlogAction : createBlogAction, undefined);

  /*
   * Every field is controlled, for the reason the product form's are: React 19
   * calls `form.reset()` when an action resolves, so an uncontrolled `required`
   * input comes back empty after a refused submit — and then refuses the next
   * one without firing it, which reads as a broken button and has lost what was
   * typed.
   */
  const [title, setTitle] = useState(blog?.title ?? "");
  const [shortDescription, setShortDescription] = useState(blog?.shortDescription ?? "");
  const [description, setDescription] = useState(blog?.description ?? "");
  // A post whose category was deleted from under it has none, and the
  // placeholder asks for one — saving requires it, as creating does.
  const [categoryId, setCategoryId] = useState(blog?.categoryId ?? "");
  const images = useImageList({
    initial: blog?.mediaIds ?? [],
    limit: IMAGES_PER_BLOG_MAX,
    holder: "a blog post",
  });
  const uploading = images.uploading;

  return (
    <form action={formAction} className="flex max-w-[640px] flex-col gap-8">
      {blog && <input type="hidden" name="id" value={blog.id} />}

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

      <ImageListField list={images} errors={state?.errors?.mediaIds} />

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
          {blog ? (pending ? "Saving…" : "Save changes") : pending ? "Creating…" : "Create blog"}
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
