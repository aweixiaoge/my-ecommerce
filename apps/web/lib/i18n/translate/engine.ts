import { deeplConfigured, deeplTranslate } from "./deepl";
import { deepseekConfigured, deepseekTranslate } from "./deepseek";
import { TranslationError, type Translator } from "./translate";

/**
 * Which engine translates, decided by which key is present.
 *
 * Two are wired — a language model and a translation service — because they
 * are good at different things and a store should be able to move between them
 * without a code change: DeepSeek follows the shop's tone and keeps markdown,
 * DeepL is faster, cheaper per character and never invents a sentence. The
 * choice is the `.env` file's.
 *
 * DeepSeek wins when both keys are set, as the more capable of the two for
 * this copy; removing `DEEPSEEK_API_KEY` is how a store goes back to DeepL.
 * With neither, the translator is one that refuses with `unconfigured` — which
 * the run turns into "the feature is off", not into a failed save.
 */
export type TranslationEngine = "deepseek" | "deepl";

export function translationEngine(): TranslationEngine | null {
  if (deepseekConfigured()) return "deepseek";
  if (deeplConfigured()) return "deepl";

  return null;
}

/** The translator for whatever is configured. */
export function configuredTranslator(): Translator {
  switch (translationEngine()) {
    case "deepseek":
      return deepseekTranslate;
    case "deepl":
      return deeplTranslate;
    case null:
      return unconfiguredTranslator;
  }
}

const unconfiguredTranslator: Translator = async () => {
  throw new TranslationError(
    "unconfigured",
    "no translation key is set — add DEEPSEEK_API_KEY or DEEPL_API_KEY to .env (see .env.example)",
  );
};
