import { describe, expect, it, vi } from "vitest";
import { TranslationError, translateFields, type Translator } from "./translate";

/**
 * The policy, with a translator that is a function in the test.
 *
 * Nothing here reaches a network: what is worth asserting is which fields are
 * sent, in what order, and what comes back keyed where — the parts that decide
 * whether a German product page shows a German blurb or a German name in the
 * blurb's place.
 */

/** A translator that answers each text with its target language and its index,
 *  so a test can see exactly what was asked and where it landed. */
function stubTranslator(): Translator & { calls: unknown[] } {
  const calls: unknown[] = [];
  const translate: Translator = async (texts, target) => {
    calls.push({ texts, target });
    return texts.map((text) => `[${target}] ${text}`);
  };

  return Object.assign(translate, { calls });
}

describe("translateFields", () => {
  it("translates every field that has something in it", async () => {
    const translate = stubTranslator();

    const result = await translateFields(
      {
        name: "Studio Over-Ear",
        shortDescription: "Closed-back, tuned flat.",
        description: "## The basics",
      },
      "de",
      translate,
    );

    expect(result).toEqual({
      name: "[de] Studio Over-Ear",
      shortDescription: "[de] Closed-back, tuned flat.",
      description: "[de] ## The basics",
    });
  });

  it("asks once, with the fields in the order the row declares them", async () => {
    // One request rather than one per field: they are a product's name, blurb
    // and description — sentences that mean more beside each other — and one
    // request is one against the rate limit.
    const translate = stubTranslator();

    await translateFields({ name: "A", description: "B" }, "fr", translate);

    expect(translate.calls).toEqual([
      { texts: ["A", "B"], target: "fr" },
    ]);
  });

  it("leaves a null field null and an empty field empty", async () => {
    // A meta title nobody wrote is not a field to translate — sending an empty
    // string would be asking DeepL for nothing and expecting it back.
    const translate = stubTranslator();

    const result = await translateFields(
      { name: "Studio Over-Ear", metaTitle: null, metaDescription: "" },
      "es",
      translate,
    );

    expect(result).toEqual({
      name: "[es] Studio Over-Ear",
      metaTitle: null,
      metaDescription: "",
    });
    expect(translate.calls).toEqual([
      { texts: ["Studio Over-Ear"], target: "es" },
    ]);
  });

  it("asks for nothing when the row has nothing to translate", async () => {
    const translate = stubTranslator();

    expect(await translateFields({ name: null, description: "" }, "pt", translate)).toEqual({
      name: null,
      description: "",
    });
    expect(translate.calls).toEqual([]);
  });

  it("refuses an answer that is not one text per field", async () => {
    // A translator that drops a text would silently shift every later field
    // onto the wrong key — a description in the name column, which is worse
    // than a failure.
    const short: Translator = async (texts) => texts.slice(0, -1);

    await expect(
      translateFields({ name: "A", description: "B" }, "de", short),
    ).rejects.toThrow(TranslationError);
  });

  it("passes the translator's own failure through", async () => {
    const failing: Translator = async () => {
      throw new TranslationError("quota", "the plan is used up");
    };

    await expect(
      translateFields({ name: "A" }, "de", failing),
    ).rejects.toMatchObject({ kind: "quota" });
  });

  it("skips only null and empty — a space somebody typed is still their content", async () => {
    // Not trimmed and not treated as blank: "" is the form's way of saying
    // "nothing written here", and anything else was typed by a person. Turning
    // "   " into "" would be this module editing the row rather than
    // translating it.
    const translate = vi.fn(async (texts: readonly string[]) => [...texts]);

    await translateFields({ name: "A", description: "   " }, "de", translate);

    expect(translate).toHaveBeenCalledWith(["A", "   "], "de");
  });
});
