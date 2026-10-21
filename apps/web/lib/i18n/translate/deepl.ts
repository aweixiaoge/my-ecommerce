import {
  REGISTER,
  TRANSLATION_CONTEXT,
  TranslationError,
  type TargetLocale,
  type Translator,
} from "./translate";

/**
 * DeepL, as this app talks to it.
 *
 * The one module that knows a translation service exists. It is imported by
 * Server Actions alone — never by a component — so the key it reads stays on
 * the server, and `process.env` is read at call time rather than captured at
 * import, which is what lets a test set a key per case.
 *
 * The contract, per DeepL's own documentation: `POST /v2/translate` with an
 * `Authorization: DeepL-Auth-Key <key>` header, a JSON body carrying `text` as
 * an array (50 at most per request), and a response of
 * `{ translations: [{ detected_source_language, text }] }`.
 */

/** Free keys end in `:fx` and answer on a different host; that suffix is the
 *  whole of the difference between the two plans as far as a caller is
 *  concerned, and getting it wrong is a 403 that reads like a bad key. */
const ENDPOINT_FREE = "https://api-free.deepl.com/v2/translate";
const ENDPOINT_PAID = "https://api.deepl.com/v2/translate";

/** DeepL's ceiling per request. A product's fields are nowhere near it; the
 *  batching exists so that a row with option names attached still is not. */
const BATCH_SIZE = 50;

/** Long enough for a slow batch, short enough that a save never hangs on a
 *  service that is not answering. */
const TIMEOUT_MS = 15_000;

/** DeepL's target codes. Portuguese is asked for by region because DeepL has
 *  no bare `PT`, and the storefront's catalog is written as European
 *  Portuguese. */
const TARGET_CODE: Record<TargetLocale, string> = {
  de: "DE",
  fr: "FR",
  pt: "PT-PT",
  es: "ES",
};

/**
 * DeepL's two words for the register, against the decision `translate.ts`
 * holds — so both engines write in the register the UI is already written in.
 *
 * A lookup rather than a condition per language: the register is a constant,
 * so a ternary would have a branch nothing can ever take.
 */
const DEEPL_FORMALITY: Record<"informal" | "formal", "less" | "more"> = {
  informal: "less",
  formal: "more",
};

/** Whether a key is configured. Not an error when it is not — the integration
 *  is optional, and a save without it is a save. */
export function deeplConfigured(): boolean {
  return (process.env.DEEPL_API_KEY ?? "").trim() !== "";
}

/**
 * The texts, in the target language, in the order they arrived.
 *
 * A list of one is the ordinary case; the array is the shape DeepL wants and
 * the shape that keeps a product's name, blurb and description in one request
 * rather than three against a rate limit.
 */
export const deeplTranslate: Translator = async (texts, target) => {
  const key = (process.env.DEEPL_API_KEY ?? "").trim();

  if (key === "") {
    throw new TranslationError(
      "unconfigured",
      "DEEPL_API_KEY is not set — see .env.example",
    );
  }

  const translated: string[] = [];

  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    translated.push(
      ...(await translateBatch(texts.slice(start, start + BATCH_SIZE), target, key)),
    );
  }

  return translated;
};

async function translateBatch(
  texts: readonly string[],
  target: TargetLocale,
  key: string,
): Promise<string[]> {
  const body = (withFormality: boolean) => ({
    text: [...texts],
    target_lang: TARGET_CODE[target],
    source_lang: "EN",
    // DeepL treats the text as text, but this is what stops it normalising the
    // punctuation a markdown description is made of.
    preserve_formatting: true,
    context: TRANSLATION_CONTEXT,
    ...(withFormality ? { formality: DEEPL_FORMALITY[REGISTER[target]] } : {}),
  });

  let response = await post(key, body(true));

  /*
   * 400 is DeepL refusing something about the request, and `formality` is the
   * one parameter here it does not accept for every plan and language. Losing
   * the register is a worse translation; losing the translation is worse than
   * that, so it is retried once without the parameter rather than failed.
   */
  if (response.status === 400) {
    response = await post(key, body(false));
  }

  if (!response.ok) throw failureFor(response.status, await bodyText(response));

  const payload = (await response.json()) as {
    translations?: { text?: string }[];
  };

  const texts_ = (payload.translations ?? []).map((entry) => entry.text ?? "");

  if (texts_.length !== texts.length) {
    throw new TranslationError(
      "response",
      `DeepL answered with ${texts_.length} texts for ${texts.length}`,
    );
  }

  return texts_;
}

async function post(key: string, body: unknown): Promise<Response> {
  const endpoint = key.endsWith(":fx") ? ENDPOINT_FREE : ENDPOINT_PAID;

  try {
    return await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    // A refusal that never reached DeepL — DNS, TLS, the timeout above — is one
    // kind, because there is one thing to do about it: try again in a moment.
    throw new TranslationError(
      "network",
      `DeepL could not be reached: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/** DeepL's statuses, as the remedies they imply. Quota is 456 rather than a
 *  4xx range guess: it is the one that means "the plan is used up", which is a
 *  different sentence from "slow down". */
function failureFor(status: number, detail: string): TranslationError {
  const suffix = detail === "" ? "" : ` — ${detail}`;

  if (status === 401 || status === 403) {
    return new TranslationError("auth", `DeepL refused the key (${status})${suffix}`);
  }
  if (status === 429) {
    return new TranslationError("rate", `DeepL is rate-limiting (429)${suffix}`);
  }
  if (status === 456) {
    return new TranslationError(
      "quota",
      `the DeepL plan's character quota is used up (456)${suffix}`,
    );
  }

  return new TranslationError("response", `DeepL answered ${status}${suffix}`);
}

/** The body as a short string. A response that is not text at all is still a
 *  status worth reporting, so this never throws. */
async function bodyText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return "";
  }
}
