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
 * The Contact page's form (Figma 178:7686), in the storefront's luxury
 * register — the same as the account's fields: a label in small tracked
 * capitals above a square 46px box on a hairline, a gold asterisk on the
 * required ones, 24px between fields, and the 170px message box.
 *
 * Not the account's `AccountField` itself: that one is built around a
 * password's eye button and an email's autocomplete, and this form has a
 * textarea and optional fields. The two now dress alike rather than share.
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
        <p className="border border-line border-l-2 border-l-gold bg-ivory px-[20px] py-[16px] font-display text-[18px] leading-[28px] text-ink">
          {messages.sent}
        </p>
        <button
          type="button"
          onClick={onAnother}
          className="mt-[20px] text-[12px] leading-5 font-medium tracking-[0.14em] text-ink uppercase underline decoration-gold underline-offset-4"
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
          className="mb-[20px] border border-danger px-[15px] py-[8px] text-[14px] leading-[23.1px] tracking-[-0.15px] text-danger"
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
          className={`${BOX} h-[46px] ${errors.name ? "border-danger" : "border-line"}`}
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
          className={`${BOX} h-[46px] ${errors.email ? "border-danger" : "border-line"}`}
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
          className={`${BOX} h-[46px] ${errors.subject ? "border-danger" : "border-line"}`}
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

      <div className="pt-[32px]">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-[46px] items-center justify-center border border-ink bg-ink px-8 text-[13px] leading-5 font-medium tracking-[0.14em] text-paper transition-colors duration-300 hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-ink disabled:hover:text-paper"
        >
          {pending ? messages.sending : messages.submit}
        </button>
      </div>
    </form>
  );
}

const BOX =
  "w-full border bg-paper px-[15px] text-[16px] text-ink outline-none transition-colors placeholder:text-ink-55 focus:border-ink";

/**
 * A label row and its control; each field after the first sits 24px below
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
    <div className="not-first-of-type:pt-[24px]">
      <label
        htmlFor={id}
        className="block pb-2 text-[11px] leading-4 font-medium tracking-[0.18em] text-ink-55 uppercase"
      >
        {label}
        {required && (
          <>
            {" "}
            <span aria-hidden className="text-gold">
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
