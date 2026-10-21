import { describe, expect, it } from "vitest";
import { fallbackLocales, shownTranslation } from "./translation";

/**
 * The fallback rule, which the whole storefront's content reads hang on: which
 * locales a query fetches, and which of the rows it gets back is displayed.
 */

describe("fallbackLocales", () => {
  it("asks for the page's language and the default behind it", () => {
    expect(fallbackLocales("de")).toEqual(["de", "en"]);
    expect(fallbackLocales("pt")).toEqual(["pt", "en"]);
  });

  it("asks once when they are the same language", () => {
    // English asks for English, not for itself twice.
    expect(fallbackLocales("en")).toEqual(["en"]);
  });
});

describe("shownTranslation", () => {
  const english = { locale: "en", name: "Earbuds" };
  const german = { locale: "de", name: "Ohrstöpsel" };

  it("prefers the page's language", () => {
    expect(shownTranslation([german, english], "de")).toBe(german);
    expect(shownTranslation([german, english], "en")).toBe(english);
  });

  it("falls back to the other row — the default, in the order the query returns", () => {
    // The queries fetch exactly `fallbackLocales`, so the row that is not the
    // page's language *is* the default.
    expect(shownTranslation([english], "de")).toBe(english);
  });

  it("answers nothing when there is no translation at all", () => {
    // The one state with nothing to show: a row whose translations were both
    // deleted, which every mapper answers `null`/`""` for.
    expect(shownTranslation([], "de")).toBeUndefined();
  });

  it("does not care what the row carries beyond its language", () => {
    // Structural, because it is used on products, categories, options, option
    // values and posts — anything with `(entity_id, locale)` rows behind it.
    expect(shownTranslation([{ locale: "fr", id: "val_1" }], "fr")).toEqual({
      locale: "fr",
      id: "val_1",
    });
  });
});
