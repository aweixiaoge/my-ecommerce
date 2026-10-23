"use server";

import { ContactMessageSchema } from "@my-ecommerce/shared";
import { saveContactMessage } from "@/lib/contact/contact-repo";
import { getMessages, type Messages } from "@/lib/i18n/messages";
import { hasLocale, type Locale } from "@/lib/languages";
import { DEFAULT_LOCALE } from "@/lib/locale";

/**
 * "Submit Form" on the Contact page.
 *
 * Server Actions can be posted to directly, so everything is re-derived from
 * `formData`. On a refusal the typed values come back, so the boxes keep
 * what was written — a lost message is the worst thing this form can do.
 */

export interface ContactFormValues {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export type ContactFormState =
  | { status: "sent" }
  | {
      status: "invalid" | "failed";
      /** Field errors by the field's name in the form. */
      errors?: Partial<Record<keyof ContactFormValues, string>>;
      /** A sentence for the whole form. */
      message?: string;
      values: ContactFormValues;
    };

export async function sendContactMessageAction(
  _prevState: ContactFormState | undefined,
  formData: FormData,
): Promise<ContactFormState> {
  const locale = submittedLocale(formData.get("locale"));
  const messages = getMessages(locale).contactPage.errors;
  const values: ContactFormValues = {
    name: text(formData, "name"),
    email: text(formData, "email"),
    subject: text(formData, "subject"),
    message: text(formData, "message"),
  };

  const parsed = ContactMessageSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Partial<Record<keyof ContactFormValues, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as keyof ContactFormValues;
      errors[field] ??= messageFor(field, issue.code, messages);
    }
    return { status: "invalid", errors, values };
  }

  try {
    await saveContactMessage(parsed.data, locale);
  } catch (error) {
    console.error("Saving a contact message failed:", error);
    return { status: "failed", message: messages.failed, values };
  }

  return { status: "sent" };
}

function messageFor(
  field: keyof ContactFormValues,
  code: string,
  messages: Messages["contactPage"]["errors"],
): string {
  if (code === "too_big") return messages.tooLong;
  if (field === "email") return messages.email;
  return messages.required;
}

/** The language the form was drawn in, or the default for a tampered one. */
function submittedLocale(raw: FormDataEntryValue | null): Locale {
  const value = typeof raw === "string" ? raw : "";
  return hasLocale(value) ? value : DEFAULT_LOCALE;
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
