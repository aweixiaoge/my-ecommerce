"use client";

import { startTransition, useActionState, useState } from "react";
import {
  STORE_CONTACT_TEXT_MAX,
  STORE_CONTACT_URL_MAX,
  type StoreContact,
} from "@my-ecommerce/shared";
import {
  saveStoreContactAction,
  type StoreContactField,
  type StoreContactFormState,
} from "@/app/admin/(shell)/contact-info/actions";
import { FieldErrors, inputClass, LABEL } from "./form-controls";

/**
 * The Contact → Info form: everything the storefront's "Get in Touch" column
 * and footer icons show.
 *
 * Every field is controlled, and the submit goes through `onSubmit` rather than
 * the form's own action, for the coupon form's reason: React 19 resets a form
 * when its action resolves, and this one has to keep showing what was saved.
 */

const FIELDS: readonly {
  name: StoreContactField;
  label: string;
  type: "text" | "email" | "tel" | "url";
  hint: string;
  placeholder: string;
}[] = [
  { name: "phone", label: "Tel", type: "tel", hint: "Shown as a tap-to-call link.", placeholder: "+1 234 567 890" },
  { name: "email", label: "Email", type: "email", hint: "Shown as a mailto link.", placeholder: "info@example.com" },
  {
    name: "whatsapp",
    label: "WhatsApp",
    type: "tel",
    hint: "Include the country code — the link opens a chat at wa.me.",
    placeholder: "0086-18823456748",
  },
  { name: "address", label: "Address", type: "text", hint: "One line, as it should read.", placeholder: "123 Main St, City, Country" },
  { name: "facebookUrl", label: "Facebook link", type: "url", hint: "", placeholder: "https://facebook.com/yourshop" },
  { name: "instagramUrl", label: "Instagram link", type: "url", hint: "", placeholder: "https://instagram.com/yourshop" },
  { name: "youtubeUrl", label: "YouTube link", type: "url", hint: "", placeholder: "https://youtube.com/@yourshop" },
];

export function StoreContactForm({ contact }: { contact: StoreContact }) {
  const [state, formAction, pending] = useActionState<StoreContactFormState | undefined, FormData>(
    saveStoreContactAction,
    undefined,
  );
  const [values, setValues] = useState<Record<StoreContactField, string>>(() => ({
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    whatsapp: contact.whatsapp ?? "",
    address: contact.address ?? "",
    facebookUrl: contact.facebookUrl ?? "",
    instagramUrl: contact.instagramUrl ?? "",
    youtubeUrl: contact.youtubeUrl ?? "",
  }));
  // The "Saved" note belongs to the values it saved; an edit after it makes it
  // a claim about something else, so it goes until the next save.
  const [dirty, setDirty] = useState(false);

  const errors = state?.errors;

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setDirty(false);
        startTransition(() => formAction(formData));
      }}
      noValidate
      className="flex max-w-[640px] flex-col gap-6"
    >
      {state?.message && (
        <p
          role="alert"
          className="rounded-control border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] leading-[21.45px] text-red-700"
        >
          {state.message}
        </p>
      )}

      <p className="text-[13px] leading-[21.45px] text-ink-60">
        Leave a field empty to hide it on the storefront.
      </p>

      {FIELDS.map((field) => {
        const error = errors?.[field.name];
        const hintId = field.hint ? `${field.name}-hint` : undefined;

        return (
          <div key={field.name} className="flex flex-col gap-2">
            <label htmlFor={field.name} className={LABEL}>
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              autoComplete="off"
              spellCheck={false}
              maxLength={field.type === "url" ? STORE_CONTACT_URL_MAX : STORE_CONTACT_TEXT_MAX}
              placeholder={field.placeholder}
              value={values[field.name]}
              onChange={(event) => {
                const value = event.target.value;
                setValues((previous) => ({ ...previous, [field.name]: value }));
                setDirty(true);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${field.name}-error` : hintId}
              className={`h-11 ${inputClass(Boolean(error))}`}
            />
            {field.hint && (
              <p id={hintId} className="text-[12px] leading-[19.8px] text-ink-55">
                {field.hint}
              </p>
            )}
            <FieldErrors id={`${field.name}-error`} messages={error ? [error] : undefined} />
          </div>
        );
      })}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-control bg-ink px-6 text-[14px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <p role="status" className="text-[13px] text-ink-60">
          {state?.saved && !dirty && !pending ? "Saved. The storefront shows the new details now." : ""}
        </p>
      </div>
    </form>
  );
}
