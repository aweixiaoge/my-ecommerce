"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { createProductAction } from "@/app/admin/(shell)/products/actions";
import {
  ATTRIBUTE_LABELS,
  ATTRIBUTE_PLACEHOLDERS,
  availableKinds,
  nextAvailableKind,
  parseAttributeValues,
  serializeAttributes,
  type FormAttribute,
} from "@/lib/admin/product-form";
import { MarkdownPreview } from "./markdown-preview";

const TABS = [
  { id: "write", label: "Write" },
  { id: "preview", label: "Preview" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * The create-product form.
 *
 * A Client Component because the description editor and the attribute rows are
 * interactive before anything is submitted — a preview that needs a round trip
 * to the server would show the author their copy a second late, and an
 * attribute list is edited long before the form is sent. The rules are all
 * elsewhere: the shared schema decides what is valid, `lib/admin/product-form`
 * decides what is typed, and this file decides where it sits on the screen.
 */
export function ProductForm() {
  const [state, formAction, pending] = useActionState(
    createProductAction,
    undefined,
  );

  const [description, setDescription] = useState("");
  const [tab, setTab] = useState<TabId>("write");
  const [attributes, setAttributes] = useState<FormAttribute[]>([]);

  // The form's own inputs are uncontrolled so a failed submit keeps what was
  // typed — React restores them from the DOM, and the only field that has to be
  // state is the one something else reads (the preview).
  const nextKind = nextAvailableKind(attributes);

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

                <ValueChips values={parseAttributeValues(attribute.values)} />
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
          The one field the form assembles rather than the browser: attributes
          are structured, and a form can only send strings. It is the same list
          the chips above are drawn from, so what is submitted is what is on
          screen.
        */}
        <input
          type="hidden"
          name="attributes"
          value={serializeAttributes(attributes)}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className={LABEL}>Description</h2>

          <div
            role="tablist"
            aria-label="Description editor"
            className="flex gap-1 rounded-control border border-line p-0.5"
          >
            {TABS.map((entry, index) => (
              <Tab
                key={entry.id}
                entry={entry}
                index={index}
                selected={tab === entry.id}
                onSelect={setTab}
              />
            ))}
          </div>
        </div>

        <div
          role="tabpanel"
          aria-labelledby={`description-tab-${tab}`}
          className="rounded-card border border-line"
        >
          {tab === "write" ? (
            <textarea
              id="description"
              name="description"
              rows={14}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={"## Materials\n\n- Recycled aluminium\n- **Memory** foam"}
              className="w-full resize-y rounded-card bg-paper p-3 font-mono text-[13px] leading-[21.45px] text-ink outline-none focus:ring-2 focus:ring-ink/15"
            />
          ) : (
            <div className="p-4">
              <MarkdownPreview source={description} />
            </div>
          )}
        </div>

        {/*
          The textarea is unmounted while the preview is showing, so on that
          tab nothing would send the description — submitting from the preview
          would save a product with no copy. The value travels in a hidden
          field instead, so the description is submitted from either tab.
        */}
        {tab !== "write" && (
          <input type="hidden" name="description" value={description} />
        )}

        <p className="text-[12px] leading-[19.8px] text-ink-55">
          Markdown: # headings, - lists, **bold**, *italic*, `code` and [links](https://example.com).
        </p>
        <FieldErrors
          id="description-error"
          messages={state?.errors?.description}
        />
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-control bg-ink px-5 text-[14px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create product"}
        </button>

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

function Tab({
  entry,
  index,
  selected,
  onSelect,
}: {
  entry: (typeof TABS)[number];
  index: number;
  selected: boolean;
  onSelect: (id: TabId) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  /**
   * Arrow keys move between tabs and take the focus with them — the behaviour
   * a tablist is expected to have, and the reason only the selected tab is in
   * the tab order (`tabIndex` below): one stop for the pair, not two.
   */
  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % TABS.length
        : event.key === "ArrowLeft"
          ? (index - 1 + TABS.length) % TABS.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? TABS.length - 1
              : null;

    if (next === null) return;

    event.preventDefault();
    onSelect(TABS[next]!.id);
    ref.current?.parentElement?.querySelectorAll("button")[next]?.focus();
  }

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      id={`description-tab-${entry.id}`}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onKeyDown={onKeyDown}
      onClick={() => onSelect(entry.id)}
      className={`h-7 rounded-[3px] px-3 text-[12px] font-medium transition-colors ${
        selected ? "bg-mist text-ink" : "text-ink-62 hover:text-ink"
      }`}
    >
      {entry.label}
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

function FieldErrors({
  id,
  messages,
  announce = false,
}: {
  id: string;
  messages?: string[];
  announce?: boolean;
}) {
  if (!messages || messages.length === 0) return null;

  return (
    <ul
      id={id}
      role={announce ? "alert" : undefined}
      className="text-[12px] leading-[19.8px] text-red-600"
    >
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
}

const LABEL =
  "text-[13px] font-bold leading-[16.9px] tracking-[-0.076px] text-ink";

function inputClass(invalid: boolean): string {
  return `rounded-control border bg-paper px-3 text-[14px] text-ink transition-colors outline-none focus:ring-2 ${
    invalid
      ? "border-red-500 focus:border-red-500 focus:ring-red-500/15"
      : "border-line focus:border-ink focus:ring-ink/15"
  }`;
}
