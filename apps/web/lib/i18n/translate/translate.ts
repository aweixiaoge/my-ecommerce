import type { Locale } from "@/lib/languages";

/**
 * Translating a record's copy, with no HTTP in it.
 *
 * The admin has one shape of content everywhere — a handful of text fields on a
 * row, most of them optional — and one place to translate it. Which service
 * does the work arrives as an argument (`Translator`), which is what lets every
 * test of this module and the ones above it run without a network.
 */

/**
 * The languages content is translated *into*.
 *
 * Not English: it is the language the admin writes in, and the one every other
 * translation falls back to. Typed as a literal tuple so the DeepL client can
 * map each one to its own target code and know it has covered all of them.
 */
export const TARGET_LOCALES = ["de", "fr", "pt", "es"] as const;

export type TargetLocale = Extract<Locale, (typeof TARGET_LOCALES)[number]>;

/** Each language's own name, for engines that are told what to translate
 *  *into* in words rather than in codes. Portuguese is named by region for the
 *  same reason the catalog is written as European Portuguese. */
export const LANGUAGE_NAME: Record<TargetLocale, string> = {
  de: "German",
  fr: "French",
  pt: "European Portuguese",
  es: "Spanish",
};

/**
 * How each language addresses the reader — the same decision the hand-written
 * catalogs make, in one place so that both engines translate in the register
 * the UI is already written in.
 *
 * German and Spanish speak to the reader informally, French and Portuguese
 * politely. An engine spells these differently (DeepL has two enum values; a
 * language model is told in words), which is why this is the intent rather
 * than either spelling.
 */
export const REGISTER: Record<TargetLocale, "informal" | "formal"> = {
  de: "informal",
  fr: "formal",
  pt: "formal",
  es: "informal",
};

/**
 * What the engines are told about the text they are translating.
 *
 * Every one of these engines does better with a sentence of context — a
 * product name with no sentence around it is where translation guesses — and
 * the shop's own description is the useful part: what the site sells, that the
 * copy is short and plain, and that the brand is not a word to translate.
 */
export const TRANSLATION_CONTEXT =
  'Product copy for "Smart Mall", a shop that hand-tests audio gear: earbuds, earphones and headphones. Keep the tone plain and confident, keep any markdown formatting exactly as it is, and leave the brand name "Smart Mall" and product model names untranslated.';

/** What a translator is, as far as this app is concerned: texts in, texts out,
 *  in the same order and the same number. */
export type Translator = (
  texts: readonly string[],
  target: TargetLocale,
) => Promise<string[]>;

/**
 * Why a translation did not happen, in the terms the admin can act on.
 *
 * `unconfigured` is the one that is nobody's fault and is not an error state:
 * no key is set, so the feature is simply off. The rest describe a service that
 * was asked and refused — and each has a different remedy (fix the key, wait,
 * upgrade the plan, try again), which is why they are not one kind.
 */
export type TranslationFailureKind =
  | "unconfigured"
  | "auth"
  | "quota"
  | "rate"
  | "network"
  | "response";

export class TranslationError extends Error {
  constructor(
    readonly kind: TranslationFailureKind,
    message: string,
  ) {
    super(message);
    this.name = "TranslationError";
  }
}

/** A row's copy, keyed by field name. `null` is a field the row does not have
 *  — a meta title nobody wrote — and `""` is one written empty; both are
 *  passed through untouched. */
export type FieldValues = Record<string, string | null>;

/**
 * The fields, translated: `null` and empty strings are left exactly as they
 * came in, everything else goes to the translator in one call and comes back
 * keyed the same way.
 *
 * One call for the whole row rather than one per field, because the fields are
 * a product's name, its blurb and its description — sentences that mean more
 * beside each other than alone, and a batch is also one request against a rate
 * limit rather than six.
 *
 * The translator answers in order and in full; a short answer is a bug in the
 * translator, not a row with a field missing, so it is refused here rather than
 * silently shifting every later field onto the wrong key.
 */
export async function translateFields(
  fields: FieldValues,
  target: TargetLocale,
  translate: Translator,
): Promise<FieldValues> {
  const keys = Object.keys(fields).filter(
    (key) => fields[key] !== null && fields[key] !== "",
  );

  if (keys.length === 0) return { ...fields };

  const translated = await translate(keys.map((key) => fields[key] as string), target);

  if (translated.length !== keys.length) {
    throw new TranslationError(
      "response",
      `the translator answered with ${translated.length} texts for ${keys.length}`,
    );
  }

  const result: FieldValues = { ...fields };
  keys.forEach((key, index) => {
    result[key] = translated[index] as string;
  });

  return result;
}
