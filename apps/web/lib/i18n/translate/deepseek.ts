import {
  LANGUAGE_NAME,
  REGISTER,
  TRANSLATION_CONTEXT,
  TranslationError,
  type TargetLocale,
  type Translator,
} from "./translate";

/**
 * DeepSeek, as this app talks to it.
 *
 * A language model rather than a translation service, which is a different
 * bargain: it is told the shop's own context and the register to write in, so
 * product copy comes back in the voice the hand-written catalogs use, and
 * markdown survives because the instruction says so — but it is a model, and a
 * model asked for a JSON array can answer with something else. Everything here
 * after the request is about refusing that rather than writing it into a row.
 *
 * The API is OpenAI-compatible: `POST /chat/completions` with a Bearer key.
 * The model is a *setting* rather than a constant (`DEEPSEEK_MODEL`), because
 * DeepSeek retires model ids — `deepseek-chat` and `deepseek-reasoner` were
 * retired in July 2026 — and a store should not need a deploy to move to the
 * next one. The default is the cheap general model as this was written.
 *
 * Imported by Server Actions alone: the key stays on the server, and it is
 * read at call time rather than captured at import, so a test can set one.
 */
const ENDPOINT = "https://api.deepseek.com/chat/completions";

const DEFAULT_MODEL = "deepseek-flash";

/** Longer than the DeepL client's timeout because a model has to generate the
 *  whole answer rather than look it up — and short enough that a save is never
 *  held open by a service that is not answering. */
const TIMEOUT_MS = 20_000;

/** Whether a key is configured. Not an error when it is not — the integration
 *  is optional, and a save without it is a save. */
export function deepseekConfigured(): boolean {
  return (process.env.DEEPSEEK_API_KEY ?? "").trim() !== "";
}

export const deepseekTranslate: Translator = async (texts, target) => {
  const key = (process.env.DEEPSEEK_API_KEY ?? "").trim();

  if (key === "") {
    throw new TranslationError(
      "unconfigured",
      "DEEPSEEK_API_KEY is not set — see .env.example",
    );
  }

  const response = await post(
    key,
    {
      model: (process.env.DEEPSEEK_MODEL ?? "").trim() || DEFAULT_MODEL,
      // JSON mode, which is what makes the answer parseable — and what asks
      // for the word "json" in the prompt, which the system message has.
      response_format: { type: "json_object" },
      /*
       * Thinking off, and that is a decision rather than a default. These
       * models reason before answering unless told not to; DeepSeek's own
       * guidance names low-latency, high-throughput and formatting-sensitive
       * work as the cases for the non-thinking mode, and translating five
       * sentences into German is all three. Measured, it is also the
       * difference between about twelve seconds and about two, and thinking
       * mode bills for the reasoning as output tokens.
       */
      thinking: { type: "disabled" },
      // Low rather than zero: translation wants the same answer twice, and
      // `translation` is not a task where a little variety helps. (This has no
      // effect in thinking mode, which is another thing that turning it off
      // buys.)
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt(target, texts.length) },
        { role: "user", content: JSON.stringify({ texts }) },
      ],
    },
  );

  if (!response.ok) throw failureFor(response.status, await bodyText(response));

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  return parseAnswer(payload.choices?.[0]?.message?.content ?? "", texts.length);
};

function systemPrompt(target: TargetLocale, count: number): string {
  const register =
    REGISTER[target] === "informal"
      ? "Address the reader informally, as a shop talking to someone it knows."
      : "Address the reader politely, as a shop talking to a customer.";

  return [
    TRANSLATION_CONTEXT,
    `Translate the texts the user sends from English into ${LANGUAGE_NAME[target]}.`,
    register,
    `Answer with json only: an object whose "translations" array holds exactly ${count} strings — one per text, in the same order, the same length, nothing added or merged.`,
  ].join(" ");
}

/** The model's answer, as the texts it was asked for — or a refusal.
 *
 * The `count` check is the one that matters. A model that returns three
 * strings for four fields has not failed loudly; it has silently shifted every
 * field after the gap onto the wrong key, and a description would land in the
 * name column of a live product page. */
function parseAnswer(content: string, count: number): string[] {
  if (content.trim() === "") {
    throw new TranslationError(
      "response",
      "DeepSeek answered with no content — json mode occasionally returns an empty message",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new TranslationError("response", "DeepSeek's answer was not json");
  }

  const translations = (parsed as { translations?: unknown })?.translations;

  if (!Array.isArray(translations)) {
    throw new TranslationError(
      "response",
      'DeepSeek\'s answer had no "translations" array',
    );
  }

  if (translations.length !== count) {
    throw new TranslationError(
      "response",
      `DeepSeek answered with ${translations.length} texts for ${count}`,
    );
  }

  return translations.map((entry) => (typeof entry === "string" ? entry : ""));
}

async function post(key: string, body: unknown): Promise<Response> {
  try {
    return await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new TranslationError(
      "network",
      `DeepSeek could not be reached: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/** DeepSeek's statuses, as the remedies they imply. 402 is its own: the
 *  account is out of credit, which is not a rate limit and not a bad key. */
function failureFor(status: number, detail: string): TranslationError {
  const suffix = detail === "" ? "" : ` — ${detail}`;

  if (status === 401 || status === 403) {
    return new TranslationError("auth", `DeepSeek refused the key (${status})${suffix}`);
  }
  if (status === 402) {
    return new TranslationError(
      "quota",
      `the DeepSeek account is out of credit (402)${suffix}`,
    );
  }
  if (status === 429) {
    return new TranslationError("rate", `DeepSeek is rate-limiting (429)${suffix}`);
  }

  return new TranslationError("response", `DeepSeek answered ${status}${suffix}`);
}

async function bodyText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return "";
  }
}
