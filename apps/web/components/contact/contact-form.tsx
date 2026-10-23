"use client";

import { useActionState, useState, type ReactNode } from "react";
import {
  CONTACT_EMAIL_MAX,
  CONTACT_MESSAGE_MAX,
  CONTACT_NAME_MAX,
  CONTACT_SUBJECT_MAX,
} from "@my-ecommerce/shared";
import { sendContactMessageAction } from "@/app/[lang]/contact/actions";
import type { Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/languages";

/**
 * The Contact page's form (Figma 178:7686): a 15px label above a 40px box with
 * a hairline #E1E8ED border and 3px corners, a coral asterisk on the required
 * ones, 20px between fields, and the 170px message box.
 *
 * Not the account's `AccountField`: that label is 14px medium with a bold
 * #FF0000 asterisk, and this one is 15px regular with #F56C6C — the two
 * designs disagree, and each page is drawn as its own frame says.
 *
 * The design sets the placeholders in full ink, which reads as text already
 * typed. They are drawn at the site's secondary-copy alpha instead, so an
 * empty box looks empty.
 *
 * Once a message is sent the form gives way to a thank-you; "Send another"
 * remounts it empty rather than clearing each box by hand.
 */
export function ContactForm({ locale, messages }: { locale: Locale; messages: Messages["contactPage"] }) {
  const [round, setRound] = useState(0);

  return (
    <ContactFormRound key={round} locale={locale} messages={messages} onAnother={() => setRound((n) => n + 1)} />
  );
}

function ContactFormRound({
  locale,
  messages,
  onAnother,
}: {
  locale: Locale;
  messages: Messages["contactPage"];
  onAnother: () => void;
}) {
  const [state, formAction, pending] = useActionState(sendContactMessageAction, undefined);

  if (state?.status === "sent") {
    return (
      <div role="status" className="pb-[24px]">
        <p className="rounded-[3px] border-[0.91px] border-line bg-paper px-[15px] py-[12px] text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink">
          {messages.sent}
        </p>
        <button
          type="button"
          onClick={onAnother}
          className="mt-[20px] text-[15px] leading-[24.75px] font-medium tracking-[-0.234px] text-ink underline underline-offset-2"
        >
          {messages.sendAnother}
        </button>
      </div>
    );
  }

  const values = state?.values;
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} noValidate className="pb-[24px]">
      <input type="hidden" name="locale" value={locale} />

      {state?.message && (
        <p
          role="alert"
          className="mb-[20px] rounded-[3px] border-[0.91px] border-danger px-[15px] py-[8px] text-[14px] leading-[23.1px] tracking-[-0.15px] text-danger"
        >
          {state.message}
        </p>
      )}

      <Field id="contact-name" label={messages.name} required={messages.required} error={errors.name}>
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={CONTACT_NAME_MAX}
          placeholder={messages.namePlaceholder}
          defaultValue={values?.name}
          {...describedBy("contact-name", errors.name)}
          className={`${BOX} h-[40px] ${errors.name ? "border-danger" : "border-line"}`}
        />
      </Field>

      <Field id="contact-email" label={messages.email} required={messages.required} error={errors.email}>
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={CONTACT_EMAIL_MAX}
          placeholder={messages.emailPlaceholder}
          defaultValue={values?.email}
          {...describedBy("contact-email", errors.email)}
          className={`${BOX} h-[40px] ${errors.email ? "border-danger" : "border-line"}`}
        />
      </Field>

      <Field id="contact-subject" label={messages.subject} error={errors.subject}>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          maxLength={CONTACT_SUBJECT_MAX}
          placeholder={messages.subjectPlaceholder}
          defaultValue={values?.subject}
          {...describedBy("contact-subject", errors.subject)}
          className={`${BOX} h-[40px] ${errors.subject ? "border-danger" : "border-line"}`}
        />
      </Field>

      <Field id="contact-message" label={messages.message} required={messages.required} error={errors.message}>
        <textarea
          id="contact-message"
          name="message"
          required
          maxLength={CONTACT_MESSAGE_MAX}
          placeholder={messages.messagePlaceholder}
          defaultValue={values?.message}
          {...describedBy("contact-message", errors.message)}
          className={`${BOX} block h-[170px] resize-y py-[12px] leading-[26.4px] ${errors.message ? "border-danger" : "border-line"}`}
        />
      </Field>

      <div className="pt-[20px]">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-[40px] items-center justify-center rounded-[3px] bg-ink px-[20px] text-[15px] leading-[24.75px] font-medium tracking-[-0.234px] text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? messages.sending : messages.submit}
        </button>
      </div>
    </form>
  );
}

const BOX =
  "w-full rounded-[3px] border-[0.91px] bg-transparent px-[15px] text-[16px] tracking-[-0.3125px] text-ink outline-none placeholder:text-ink-55 focus:border-ink";

/**
 * A label row and its control. The design's row is 31.4px — the 25px label
 * line and 6.4px to the box — and each field after the first sits 20px below
 * the one before it.
 */
function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  /** What the asterisk reads as; absent for an optional field. */
  required?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="not-first-of-type:pt-[20px]">
      <label
        htmlFor={id}
        className="block pb-[6.4px] text-[15px] leading-[24.75px] tracking-[-0.234px] text-ink"
      >
        {label}
        {required && (
          <>
            {" "}
            <span aria-hidden className="text-[#f56c6c]">
              *
            </span>
            <span className="sr-only">({required})</span>
          </>
        )}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="pt-1 text-[13px] leading-[18.2px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, error: string | undefined) {
  return error ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {};
}
