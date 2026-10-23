"use server";

import { StoreContactSchema } from "@my-ecommerce/shared";
import { saveStoreContact } from "@/lib/contact/store-contact-repo";
import { getSession } from "@/lib/admin/session";

/**
 * "Save" on Contact → Info.
 *
 * Thin, like the coupon action: the rule is the shared schema's and the write
 * is the repository's. Reachable by direct POST, so the session is checked and
 * the payload re-derived from `formData` before anything is written.
 *
 * Nothing to revalidate: the storefront reads the row at request time, so the
 * next Contact page or footer drawn already has the new values.
 */

export type StoreContactField =
  | "phone"
  | "email"
  | "whatsapp"
  | "address"
  | "facebookUrl"
  | "instagramUrl"
  | "youtubeUrl";

export interface StoreContactFormState {
  errors?: Partial<Record<StoreContactField, string>>;
  message?: string;
  /** Set when the save went through, so the form can say so. */
  saved?: boolean;
}

const FIELDS: readonly StoreContactField[] = [
  "phone",
  "email",
  "whatsapp",
  "address",
  "facebookUrl",
  "instagramUrl",
  "youtubeUrl",
];

export async function saveStoreContactAction(
  _prevState: StoreContactFormState | undefined,
  formData: FormData,
): Promise<StoreContactFormState> {
  if (!(await getSession())) {
    return { message: "Your session has expired. Sign in again." };
  }

  const parsed = StoreContactSchema.safeParse(
    Object.fromEntries(
      FIELDS.map((field) => {
        const value = formData.get(field);
        return [field, typeof value === "string" ? value : ""];
      }),
    ),
  );

  if (!parsed.success) {
    const errors: NonNullable<StoreContactFormState["errors"]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as StoreContactField;
      errors[field] ??= messageFor(field, issue.code);
    }
    return { errors };
  }

  try {
    await saveStoreContact(parsed.data);
  } catch (error) {
    console.error("Saving the store contact details failed:", error);
    return {
      message:
        "The details could not be saved. Try again, and check the server is running if it keeps failing.",
    };
  }

  return { saved: true };
}

function messageFor(field: StoreContactField, code: string): string {
  if (code === "too_big") return "This is too long.";
  if (field === "email") return "Enter a valid email address, or leave it empty.";
  return "Enter a full link starting with https://, or leave it empty.";
}
