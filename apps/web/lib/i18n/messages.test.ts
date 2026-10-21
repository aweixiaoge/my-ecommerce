import { describe, expect, it } from "vitest";
import { LOCALES } from "@/lib/languages";
import { getMessages } from "./messages";
import { en } from "./messages/en";

/**
 * The catalogs, checked against each other.
 *
 * The type system already refuses a missing key or a stray one — every catalog
 * is written `satisfies Messages` — so what is left for a test is what types
 * cannot say: that a catalog is not a copy of the English one, that no string
 * is empty, and that the *lists* in them are the same length, which a widened
 * array type would not catch.
 */

/** Every string in a catalog, keyed by its path, so two can be compared. */
function stringsIn(value: unknown, path = ""): Map<string, string> {
  const found = new Map<string, string>();

  if (typeof value === "string") {
    found.set(path, value);
    return found;
  }

  for (const [key, child] of Object.entries(value ?? {})) {
    for (const [childPath, text] of stringsIn(child, `${path}.${key}`)) {
      found.set(childPath, text);
    }
  }

  return found;
}

describe("the message catalogs", () => {
  it("has one for every language the storefront is served in", () => {
    // The record is total over `Locale`, so this cannot fail without the
    // build failing first — it is here so the failure reads as a sentence.
    for (const locale of LOCALES) {
      expect(getMessages(locale)).toBeDefined();
    }
  });

  it("gives every language the same keys, and the same lists in them", () => {
    const english = stringsIn(en);

    for (const locale of LOCALES.filter((code) => code !== "en")) {
      const keys = [...stringsIn(getMessages(locale)).keys()].sort();

      expect(keys, `${locale} has a different set of strings`).toEqual(
        [...english.keys()].sort(),
      );
    }
  });

  it("keeps every placeholder the English sentence has", () => {
    // A translation is allowed to move a `{count}` around and allowed to add
    // one, but a sentence that has dropped it is a sentence missing the number
    // it was written to state — and a missing placeholder leaves the braces on
    // the page rather than failing anything at runtime.
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);

    for (const locale of LOCALES.filter((code) => code !== "en")) {
      const translated = stringsIn(getMessages(locale));

      for (const [path, text] of stringsIn(en)) {
        const missing = placeholders(text).filter(
          (name) => !placeholders(translated.get(path) ?? "").includes(name),
        );

        expect(missing, `${locale}${path} dropped ${missing.join(", ")}`).toEqual([]);
      }
    }
  });

  it("leaves no string empty", () => {
    for (const locale of LOCALES) {
      for (const [path, text] of stringsIn(getMessages(locale))) {
        expect(text.trim(), `${locale}${path} is empty`).not.toBe("");
      }
    }
  });

  it("is translated, not copied", () => {
    // Every key differing from the English would be the wrong rule: German
    // says "Shop", and the brand, the currency codes and the copyright line are
    // the same in all five on purpose. These two are ordinary words with an
    // ordinary translation in every language here, so a catalog that still
    // holds the English ones is a placeholder that reached production.
    for (const locale of LOCALES.filter((code) => code !== "en")) {
      const messages = getMessages(locale);

      expect(messages.cart.empty, `${locale} still says "${en.cart.empty}"`).not.toBe(
        en.cart.empty,
      );
      expect(messages.nav.account).not.toBe(en.nav.account);
    }
  });
});
