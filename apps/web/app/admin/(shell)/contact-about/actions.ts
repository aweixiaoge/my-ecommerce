"use server";

import { AboutSchema } from "@my-ecommerce/shared";
import { getSession } from "@/lib/admin/session";
import { noticeFor, type TranslationNotice } from "@/lib/admin/translation-notice";
import { translateAbout } from "@/lib/admin/translations";
import { saveAbout, UnknownAboutMediaError } from "@/lib/contact/about-repo";

/**
 * "Save" on Contact → About: the English description and the images, then the
 * translation pass that writes the other four languages — the FAQ save's
 * order, so a translation that fails is never a save that failed.
 *
 * Reachable by direct POST, so the session is checked and the payload
 * re-derived from `formData` before anything is written.
 */

export interface AboutFormState {
  errors?: { description?: string[]; mediaIds?: string[] };
  message?: string;
  /** Set when the save went through: what the translation pass said. */
  translated?: TranslationNotice;
}

export async function saveAboutAction(
  _prevState: AboutFormState | undefined,
  formData: FormData,
): Promise<AboutFormState> {
  if (!(await getSession())) {
    return { message: "Your session has expired. Sign in again." };
  }

  const description = formData.get("description");
  const parsed = AboutSchema.safeParse({
    description: typeof description === "string" ? description : "",
    mediaIds: mediaIdsFrom(formData.get("mediaIds")),
  });

  if (!parsed.success) {
    const errors: NonNullable<AboutFormState["errors"]> = {};
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === "description") errors.description = ["The description is too long."];
      else errors.mediaIds = ["The images could not be read. Reload the page and add them again."];
    }
    return { errors };
  }

  try {
    await saveAbout(parsed.data);
  } catch (error) {
    if (error instanceof UnknownAboutMediaError) return { errors: { mediaIds: [error.message] } };

    console.error("Saving the About page failed:", error);
    return {
      message:
        "The About page could not be saved. Try again, and check the server is running if it keeps failing.",
    };
  }

  // The English is stored by now. A pass that throws outright — the database
  // going away mid-run — is reported as a failed translation, not a failed save.
  try {
    return { translated: noticeFor(await translateAbout()) };
  } catch (error) {
    console.error("Translating the About page failed:", error);
    return { translated: "failed" };
  }
}

/**
 * The hidden field's JSON as an array, or something the schema refuses: a
 * tampered field is a refusal, never a page whose images were all removed.
 */
function mediaIdsFrom(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || raw === "") return [];
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
