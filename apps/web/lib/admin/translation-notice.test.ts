import { describe, expect, it } from "vitest";
import type { TranslationRun } from "./translations";
import {
  isTranslationNotice,
  noticeFor,
  translationNoticeText,
} from "./translation-notice";

/** A run, with only the parts a notice reads. */
function run(overrides: Partial<TranslationRun> = {}): TranslationRun {
  return { translated: ["de", "fr", "pt", "es"], kept: [], failed: [], ...overrides };
}

describe("noticeFor", () => {
  it("says so when every language was written", () => {
    expect(noticeFor(run())).toBe("ok");
  });

  it("counts a language that was already a person's as fine", () => {
    // Nothing to do is not a failure: a language somebody translated by hand
    // is a language this save did not have to touch.
    expect(noticeFor(run({ translated: ["fr", "pt", "es"], kept: ["de"] }))).toBe("ok");
  });

  it("separates a feature that is off from a translation that failed", () => {
    // No key is not a bug — it is the state the app ships in until somebody
    // configures it, and the sentence tells them how.
    const off = run({
      translated: [],
      failed: [
        { locale: "de", kind: "unconfigured" },
        { locale: "fr", kind: "unconfigured" },
      ],
    });
    expect(noticeFor(off)).toBe("off");

    const failed = run({
      translated: [],
      failed: [{ locale: "de", kind: "auth" }],
    });
    expect(noticeFor(failed)).toBe("failed");
  });

  it("calls a run that wrote some and not others partial", () => {
    expect(
      noticeFor(
        run({
          translated: ["de", "fr"],
          failed: [{ locale: "pt", kind: "rate" }],
        }),
      ),
    ).toBe("partial");
  });

  it("is partial, not off, when the key is fine and one language hit a quota", () => {
    expect(
      noticeFor(
        run({
          translated: ["de", "fr", "pt"],
          failed: [{ locale: "es", kind: "quota" }],
        }),
      ),
    ).toBe("partial");
  });
});

describe("isTranslationNotice", () => {
  it("accepts the four words", () => {
    for (const value of ["ok", "partial", "failed", "off"]) {
      expect(isTranslationNotice(value)).toBe(true);
    }
  });

  it("refuses anything else, including nothing at all", () => {
    // The parameter is absent on every ordinary visit; a hand-edited URL
    // should draw no notice rather than an invented one.
    for (const value of [undefined, "", "OK", "saved", ["ok"]]) {
      expect(isTranslationNotice(value)).toBe(false);
    }
  });
});

describe("translationNoticeText", () => {
  it("leads with what happened to the content, whatever the translation did", () => {
    // The row is written before the pass runs, so every one of these sentences
    // starts from a save that happened.
    for (const notice of ["ok", "partial", "failed", "off"] as const) {
      const text = translationNoticeText(notice);

      expect(text.length).toBeGreaterThan(20);
      expect(text.startsWith("Saved")).toBe(true);
    }
  });

  it("tells a person without a key how to get one", () => {
    expect(translationNoticeText("off")).toContain("DEEPL_API_KEY");
  });

  it("tells a person whose languages failed what to do next", () => {
    for (const notice of ["partial", "failed"] as const) {
      expect(translationNoticeText(notice)).toContain("Translate");
    }
  });
});
