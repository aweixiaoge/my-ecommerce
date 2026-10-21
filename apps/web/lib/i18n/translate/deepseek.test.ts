import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deepseekConfigured, deepseekTranslate } from "./deepseek";
import { TranslationError } from "./translate";

/**
 * The DeepSeek client, against a stand-in for `fetch`.
 *
 * What matters here is not the HTTP — it is what the model is asked for and
 * what is accepted back. A language model asked for a JSON array can answer
 * with anything at all, and the failure that matters is the quiet one: an
 * answer with the wrong number of strings shifts every field after the gap onto
 * the wrong key, and a description lands in a product's name column.
 */

const KEY = "sk-test-key";

/** A model's answer: a `choices[0].message.content` holding JSON — or, for
 *  the cases about refusing what a model can say, whatever string the test
 *  hands in instead. */
function answer(translations: unknown): Response {
  const content =
    typeof translations === "string"
      ? translations
      : JSON.stringify({ translations });

  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * An answer that marks every text it was sent — one entry per text, in order,
 * which is what the client demands back.
 *
 * Input-aware rather than fixed: a mock that always answers two texts would
 * make every single-text case fail on the count check, and the count check is
 * the guard this file exists to exercise.
 */
function echo(_url: string, init: RequestInit): Response {
  const body = JSON.parse(String(init.body)) as {
    messages: { role: string; content: string }[];
  };
  const { texts } = JSON.parse(
    body.messages.find((message) => message.role === "user")?.content ?? "{}",
  ) as { texts: string[] };

  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              translations: texts.map((text) => `[de] ${text}`),
            }),
          },
        },
      ],
    }),
    { status: 200 },
  );
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(echo);
  vi.stubGlobal("fetch", fetchMock);
  process.env.DEEPSEEK_API_KEY = KEY;
  delete process.env.DEEPSEEK_MODEL;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_MODEL;
});

const request = (index = 0) => fetchMock.mock.calls[index] as [string, RequestInit];
const bodyOf = (index = 0) =>
  JSON.parse(String(request(index)[1].body)) as {
    model: string;
    messages: { role: string; content: string }[];
    response_format: { type: string };
  };

describe("deepseekConfigured", () => {
  it("answers whether there is a key at all", () => {
    expect(deepseekConfigured()).toBe(true);

    delete process.env.DEEPSEEK_API_KEY;
    expect(deepseekConfigured()).toBe(false);

    process.env.DEEPSEEK_API_KEY = "  ";
    expect(deepseekConfigured()).toBe(false);
  });
});

describe("deepseekTranslate", () => {
  it("translates the texts and keeps their order", async () => {
    expect(await deepseekTranslate(["A", "B"], "de")).toEqual(["[de] A", "[de] B"]);
  });

  it("calls the chat endpoint with a bearer key", async () => {
    await deepseekTranslate(["A", "B"], "de");

    expect(request()[0]).toBe("https://api.deepseek.com/chat/completions");
    const headers = request()[1].headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(`Bearer ${KEY}`);
    expect(request()[1].method).toBe("POST");
  });

  it("asks for json, which is what makes the answer parseable", async () => {
    await deepseekTranslate(["A", "B"], "de");

    expect(bodyOf().response_format).toEqual({ type: "json_object" });
    // JSON mode requires the word somewhere in the prompt — the system message
    // is where.
    expect(bodyOf().messages[0]?.content?.toLowerCase()).toContain("json");
  });

  it("sends the model as a setting, with a current default", async () => {
    // `deepseek-chat` and `deepseek-reasoner` were retired in July 2026, so the
    // default is the cheap model that replaced them — and the id is settable
    // rather than compiled in, because DeepSeek will retire this one too.
    await deepseekTranslate(["A", "B"], "de");
    expect(bodyOf().model).toBe("deepseek-flash");

    process.env.DEEPSEEK_MODEL = "deepseek-v4-pro";
    await deepseekTranslate(["A", "B"], "de");
    expect(bodyOf(1).model).toBe("deepseek-v4-pro");

    // A variable present but empty is not a model.
    process.env.DEEPSEEK_MODEL = "  ";
    await deepseekTranslate(["A", "B"], "de");
    expect(bodyOf(2).model).toBe("deepseek-flash");
  });

  it("names the language and the register in the instruction", async () => {
    await deepseekTranslate(["A", "B"], "de");
    const german = bodyOf().messages[0]?.content ?? "";
    expect(german).toContain("German");
    expect(german).toContain("informally");
    expect(german).toContain("2 strings");

    await deepseekTranslate(["A", "B"], "fr");
    const french = bodyOf(1).messages[0]?.content ?? "";
    expect(french).toContain("French");
    expect(french).toContain("politely");
  });

  it("tells the model what the shop is, so short copy has a context", async () => {
    await deepseekTranslate(["Sand"], "de");

    expect(bodyOf().messages[0]?.content).toContain("audio gear");
  });

  it("sends the texts as json, so nothing has to be escaped by hand", async () => {
    await deepseekTranslate(['A "quoted" line\nand a second one'], "de");

    expect(JSON.parse(bodyOf().messages[1]?.content ?? "{}")).toEqual({
      texts: ['A "quoted" line\nand a second one'],
    });
  });

  it("refuses an answer with the wrong number of texts", async () => {
    // The quiet failure: three strings for four fields means every field after
    // the gap is written under the wrong name.
    fetchMock.mockResolvedValue(answer(["only one"]));

    await expect(deepseekTranslate(["A", "B"], "de")).rejects.toMatchObject({
      kind: "response",
    });
  });

  it("refuses an answer that is not json at all", async () => {
    fetchMock.mockResolvedValue(answer("I'm sorry, I can't help with that."));

    await expect(deepseekTranslate(["A", "B"], "de")).rejects.toMatchObject({
      kind: "response",
    });
  });

  it("refuses json with no translations array in it", async () => {
    fetchMock.mockResolvedValue(answer(JSON.stringify({ result: ["A", "B"] })));

    await expect(deepseekTranslate(["A", "B"], "de")).rejects.toMatchObject({
      kind: "response",
    });
  });

  it("refuses the empty message json mode occasionally returns", async () => {
    // Documented behaviour of JSON mode, and an empty string is not parseable —
    // the error should say what happened rather than blame the parser.
    fetchMock.mockResolvedValue(answer(""));

    await expect(deepseekTranslate(["A", "B"], "de")).rejects.toMatchObject({
      kind: "response",
    });
  });

  it("answers a non-string entry as an empty string", async () => {
    fetchMock.mockResolvedValue(answer(["A", 42]));

    expect(await deepseekTranslate(["A", "B"], "de")).toEqual(["A", ""]);
  });

  it("says which refusal happened, because each has its own remedy", async () => {
    for (const [status, kind] of [
      [401, "auth"],
      [403, "auth"],
      [402, "quota"],
      [429, "rate"],
      [500, "response"],
    ] as const) {
      fetchMock.mockResolvedValueOnce(new Response("nope", { status }));

      await expect(deepseekTranslate(["A"], "de")).rejects.toMatchObject({ kind });
    }
  });

  it("reports an unreachable DeepSeek as a network failure", async () => {
    fetchMock.mockRejectedValue(new Error("getaddrinfo ENOTFOUND"));

    await expect(deepseekTranslate(["A"], "de")).rejects.toMatchObject({
      kind: "network",
    });
  });

  it("reports a rejection that is not an Error at all", async () => {
    // `fetch` can reject with anything a polyfill or an abort path chooses;
    // the message only has to be something a log can print.
    fetchMock.mockRejectedValue("socket closed");

    await expect(deepseekTranslate(["A"], "de")).rejects.toMatchObject({
      kind: "network",
    });
  });

  it("still reports the status when the refusal has no readable body", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      text: () => {
        throw new Error("body already used");
      },
    } as unknown as Response);

    await expect(deepseekTranslate(["A"], "de")).rejects.toMatchObject({
      kind: "response",
    });
  });

  it("says so when there is no key, rather than calling DeepSeek", async () => {
    delete process.env.DEEPSEEK_API_KEY;

    await expect(deepseekTranslate(["A"], "de")).rejects.toBeInstanceOf(
      TranslationError,
    );
    await expect(deepseekTranslate(["A"], "de")).rejects.toMatchObject({
      kind: "unconfigured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
