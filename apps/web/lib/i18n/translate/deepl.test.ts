import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deeplConfigured, deeplTranslate } from "./deepl";
import { TranslationError } from "./translate";

/**
 * The DeepL client, against a stand-in for `fetch`.
 *
 * The lane has no external services (`.claude/tdd-guardian/config.json`), so
 * what is worth asserting is the request that would go out — the host the key
 * implies, the header, the codes and register per language — and what each of
 * DeepL's refusals turns into, because those are the things that are wrong in
 * production if they are wrong here.
 */

const KEY_FREE = "0123456789abcdef:fx";
const KEY_PAID = "0123456789abcdef";

/** A DeepL-shaped answer, translating each text by marking it. */
function answer(texts: readonly string[], marker = "de"): Response {
  return new Response(
    JSON.stringify({
      translations: texts.map((text) => ({
        detected_source_language: "EN",
        text: `[${marker}] ${text}`,
      })),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function refusal(status: number, body = ""): Response {
  return new Response(body, { status });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { text: string[] };
    return answer(body.text);
  });
  vi.stubGlobal("fetch", fetchMock);
  process.env.DEEPL_API_KEY = KEY_FREE;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DEEPL_API_KEY;
});

/** The request the client made: `[url, init]`. */
const request = (index = 0) => fetchMock.mock.calls[index] as [string, RequestInit];
const bodyOf = (index = 0) =>
  JSON.parse(String(request(index)[1].body)) as Record<string, unknown>;

describe("deeplConfigured", () => {
  it("answers whether there is a key at all", () => {
    expect(deeplConfigured()).toBe(true);

    delete process.env.DEEPL_API_KEY;
    expect(deeplConfigured()).toBe(false);

    // A variable present but empty is not a key — that is the shape of a line
    // somebody added to `.env` and did not fill in.
    process.env.DEEPL_API_KEY = "   ";
    expect(deeplConfigured()).toBe(false);
  });
});

describe("deeplTranslate", () => {
  it("translates the texts and keeps their order", async () => {
    const texts = await deeplTranslate(["Studio Over-Ear", "Closed-back"], "de");

    expect(texts).toEqual(["[de] Studio Over-Ear", "[de] Closed-back"]);
  });

  it("sends a free key to the free host and any other to the paid one", async () => {
    // The `:fx` suffix is the whole of the difference between the plans as far
    // as a caller is concerned, and calling the wrong host with a right key is
    // a 403 that reads like a bad key.
    await deeplTranslate(["A"], "de");
    expect(request()[0]).toBe("https://api-free.deepl.com/v2/translate");

    process.env.DEEPL_API_KEY = KEY_PAID;
    await deeplTranslate(["A"], "de");
    expect(request(1)[0]).toBe("https://api.deepl.com/v2/translate");
  });

  it("authenticates the way DeepL asks, with no Bearer in front of it", async () => {
    await deeplTranslate(["A"], "de");

    const headers = request()[1].headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(`DeepL-Auth-Key ${KEY_FREE}`);
    expect(request()[1].method).toBe("POST");
  });

  it("asks for each language by its own code", async () => {
    // Portuguese is asked for by region — DeepL has no bare `PT` — and the
    // storefront's catalog is written as European Portuguese.
    for (const [index, [target, code]] of (
      [
        ["de", "DE"],
        ["fr", "FR"],
        ["pt", "PT-PT"],
        ["es", "ES"],
      ] as const
    ).entries()) {
      await deeplTranslate(["A"], target);
      expect(bodyOf(index).target_lang).toBe(code);
    }
  });

  it("keeps each language's register, and says which language it is reading", async () => {
    await deeplTranslate(["A"], "de");
    expect(bodyOf()).toMatchObject({
      source_lang: "EN",
      formality: "less",
      preserve_formatting: true,
    });

    await deeplTranslate(["A"], "fr");
    expect(bodyOf(1)).toMatchObject({ formality: "more" });
  });

  it("tells DeepL what kind of text it is sending", async () => {
    // Short copy — a product name with no sentence around it — is where a
    // translator guesses, and `context` is the free field that stops it.
    await deeplTranslate(["Backbeat"], "de");

    expect(String(bodyOf().context)).toContain("audio gear");
  });

  it("batches at DeepL's ceiling of fifty texts", async () => {
    const many = Array.from({ length: 51 }, (_, index) => `Text ${index}`);

    const translated = await deeplTranslate(many, "es");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((bodyOf(0).text as string[]).length).toBe(50);
    expect((bodyOf(1).text as string[]).length).toBe(1);
    // Every text comes back, in order — the batch boundary is invisible.
    expect(translated).toEqual(many.map((text) => `[de] ${text}`));
  });

  it("retries once without the register when DeepL refuses the request", async () => {
    // 400 is DeepL refusing something about the request; `formality` is the
    // optional parameter here. Losing the register is a worse translation;
    // losing the translation is worse than that.
    fetchMock
      .mockResolvedValueOnce(refusal(400, "Bad request"))
      .mockResolvedValueOnce(answer(["A"], "de"));

    expect(await deeplTranslate(["A"], "de")).toEqual(["[de] A"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(bodyOf(1)).not.toHaveProperty("formality");
  });

  it("fails rather than retrying forever when the retry is refused too", async () => {
    fetchMock.mockResolvedValue(refusal(400, "Bad request"));

    await expect(deeplTranslate(["A"], "de")).rejects.toMatchObject({
      kind: "response",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("says which refusal happened, because each has its own remedy", async () => {
    for (const [status, kind] of [
      [403, "auth"],
      [401, "auth"],
      [429, "rate"],
      [456, "quota"],
      [503, "response"],
    ] as const) {
      fetchMock.mockResolvedValueOnce(refusal(status, "nope"));

      await expect(deeplTranslate(["A"], "de")).rejects.toMatchObject({ kind });
    }
  });

  it("reports an unreachable DeepL as a network failure", async () => {
    fetchMock.mockRejectedValue(new Error("getaddrinfo ENOTFOUND"));

    await expect(deeplTranslate(["A"], "de")).rejects.toMatchObject({
      kind: "network",
    });
  });

  it("refuses an answer that is not one text per input", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ translations: [{ text: "only one" }] }), {
        status: 200,
      }),
    );

    await expect(deeplTranslate(["A", "B"], "de")).rejects.toMatchObject({
      kind: "response",
    });
  });

  it("says so when there is no key, rather than calling DeepL", async () => {
    delete process.env.DEEPL_API_KEY;

    await expect(deeplTranslate(["A"], "de")).rejects.toBeInstanceOf(TranslationError);
    await expect(deeplTranslate(["A"], "de")).rejects.toMatchObject({
      kind: "unconfigured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still reports the status when the refusal has no readable body", async () => {
    // A proxy or a truncated response can fail to give a body at all. The
    // status is the part worth reporting, so reading it must not be able to
    // throw a second error over the first.
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      text: () => {
        throw new Error("body already used");
      },
    } as unknown as Response);

    await expect(deeplTranslate(["A"], "de")).rejects.toMatchObject({
      kind: "response",
    });
  });

  it("answers an entry with no text as an empty string", async () => {
    // DeepL always sends one — this is a guard against a response shaped like
    // DeepL's but not DeepL's, where a missing `text` would otherwise reach the
    // database as `undefined`.
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ translations: [{ detected_source_language: "EN" }] }), {
        status: 200,
      }),
    );

    expect(await deeplTranslate(["A"], "de")).toEqual([""]);
  });

  it("reports a rejection that is not an Error at all", async () => {
    // `fetch` can reject with anything a polyfill or an abort path chooses;
    // the message only has to be something a log can print.
    fetchMock.mockRejectedValue("socket closed");

    await expect(deeplTranslate(["A"], "de")).rejects.toMatchObject({
      kind: "network",
    });
  });
});
