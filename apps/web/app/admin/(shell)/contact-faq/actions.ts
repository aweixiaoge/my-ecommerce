"use server";

import { FaqSchema } from "@my-ecommerce/shared";
import { getSession } from "@/lib/admin/session";
import { noticeFor, type TranslationNotice } from "@/lib/admin/translation-notice";
import { translateFaq } from "@/lib/admin/translations";
import { saveEnglishFaqDescription } from "@/lib/contact/faq-repo";

/**
 * "Save" on Contact → FAQ: the English description, then the translation pass
 * that writes the other four languages — the order the blog and product saves
 * use, so a translation that fails is never a save that failed.
 *
 * Reachable by direct POST, so the session is checked and the payload
 * re-derived from `formData` before anything is written.
 */

export interface FaqFormState {
  errors?: { description?: string[] };
  message?: string;
  /** Set when the save went through: what the translation pass said. */
  translated?: TranslationNotice;
}

export async function saveFaqAction(
  _prevState: FaqFormState | undefined,
  formData: FormData,
): Promise<FaqFormState> {
  if (!(await getSession())) {
    return { message: "Your session has expired. Sign in again." };
  }

  const description = formData.get("description");
  const parsed = FaqSchema.safeParse({ description: typeof description === "string" ? description : "" });

  if (!parsed.success) {
    return { errors: { description: ["The description is too long."] } };
  }

  try {
    await saveEnglishFaqDescription(parsed.data.description);
  } catch (error) {
    console.error("Saving the FAQ failed:", error);
    return {
      message: "The FAQ could not be saved. Try again, and check the server is running if it keeps failing.",
    };
  }

  // The English is stored by now. A pass that throws outright — the database
  // going away mid-run — is reported as a failed translation, not a failed save.
  try {
    return { translated: noticeFor(await translateFaq()) };
  } catch (error) {
    console.error("Translating the FAQ failed:", error);
    return { translated: "failed" };
  }
}
