import type { TranslationRun } from "./translations";

/**
 * What a save's translation pass says afterwards.
 *
 * A create reports by *redirecting* — that is how the form learns it worked —
 * so the outcome cannot ride back on the state object the way a refusal does.
 * It rides in the URL instead, as one of four words, and the list page turns
 * it into a sentence. The four are the states a person can act on differently:
 * everything worked, some of it did not, none of it did, and the feature is not
 * switched on.
 *
 * Admin copy, in English, because the admin is: `lib/admin/slug.ts` writes its
 * messages the same way.
 */
export const TRANSLATION_NOTICES = ["ok", "partial", "failed", "off"] as const;

export type TranslationNotice = (typeof TRANSLATION_NOTICES)[number];

/** The word for a run. */
export function noticeFor(run: TranslationRun): TranslationNotice {
  if (run.failed.length === 0) return "ok";

  // No key set: the feature is off rather than broken, which is a different
  // sentence and a different thing to do about it.
  if (run.failed.every((failure) => failure.kind === "unconfigured")) return "off";

  return run.translated.length === 0 ? "failed" : "partial";
}

/** Whether a query parameter is one of the four. Anything else — a hand-edited
 *  URL, a typo — draws no notice at all rather than an invented one. */
export function isTranslationNotice(
  value: string | string[] | undefined,
): value is TranslationNotice {
  return (
    typeof value === "string" &&
    (TRANSLATION_NOTICES as readonly string[]).includes(value)
  );
}

/**
 * The sentence, in the admin's voice.
 *
 * "Saved" leads every one of them: the content is stored before the pass runs,
 * so a translation that did not happen is never a save that did not happen.
 */
export function translationNoticeText(notice: TranslationNotice): string {
  switch (notice) {
    case "ok":
      return "Saved, and translated into German, French, Portuguese and Spanish.";
    case "partial":
      return "Saved. Some languages could not be translated — use Translate on the row to try again.";
    case "failed":
      return "Saved, but the translation failed. Use Translate on the row to try again.";
    case "off":
      return "Saved. Translation is not configured — add DEEPSEEK_API_KEY or DEEPL_API_KEY to .env (see .env.example) to translate content into the other four languages.";
  }
}
