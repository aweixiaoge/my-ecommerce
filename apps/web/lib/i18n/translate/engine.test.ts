import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deeplTranslate } from "./deepl";
import { deepseekTranslate } from "./deepseek";
import { configuredTranslator, translationEngine } from "./engine";

/**
 * Which engine runs, decided by the `.env` file.
 *
 * The keys are the only input, so the keys are what the test sets: this is the
 * rule a store changes when it changes engines, and getting it wrong is a
 * silent one — content translated by the engine nobody configured, or by none
 * at all with no explanation.
 */

beforeEach(() => {
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPL_API_KEY;
});

afterEach(() => {
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPL_API_KEY;
});

describe("translationEngine", () => {
  it("is null when nothing is configured", () => {
    expect(translationEngine()).toBeNull();
  });

  it("names the engine a key belongs to", () => {
    process.env.DEEPSEEK_API_KEY = "sk-test";
    expect(translationEngine()).toBe("deepseek");

    delete process.env.DEEPSEEK_API_KEY;
    process.env.DEEPL_API_KEY = "0123456789abcdef:fx";
    expect(translationEngine()).toBe("deepl");
  });

  it("prefers DeepSeek when both keys are set", () => {
    // The more capable of the two for this copy. Removing the DeepSeek key is
    // how a store goes back to DeepL.
    process.env.DEEPSEEK_API_KEY = "sk-test";
    process.env.DEEPL_API_KEY = "0123456789abcdef:fx";

    expect(translationEngine()).toBe("deepseek");
  });
});

describe("configuredTranslator", () => {
  it("is the engine's own translator", () => {
    process.env.DEEPSEEK_API_KEY = "sk-test";
    expect(configuredTranslator()).toBe(deepseekTranslate);

    delete process.env.DEEPSEEK_API_KEY;
    process.env.DEEPL_API_KEY = "0123456789abcdef:fx";
    expect(configuredTranslator()).toBe(deeplTranslate);
  });

  it("refuses with unconfigured when there is no key, naming both", async () => {
    // Not an error the person caused: the run turns this into "the feature is
    // off", and the message is what tells whoever is setting the store up
    // which two variables exist to set.
    await expect(configuredTranslator()(["A"], "de")).rejects.toMatchObject({
      kind: "unconfigured",
    });

    await expect(configuredTranslator()(["A"], "de")).rejects.toThrow(
      /DEEPSEEK_API_KEY.*DEEPL_API_KEY/,
    );
  });
});
