import { describe, expect, it } from "vitest";
import { swapLocale } from "@/lib/i18n/paths";
import { LANGUAGES } from "./languages";
import { DEFAULT_LOCALE } from "./locale";

/*
 * `languages.ts` is a list, not logic, so the useful assertions are about the
 * contract between it and the rest of the app rather than about the list
 * itself — a hand-written expected copy of the array would pass by being
 * edited alongside it.
 */

describe("LANGUAGES", () => {
  it("offers the language the app defaults to", () => {
    // The switcher's trigger and its marked row both read this pairing; if
    // `DEFAULT_LOCALE` ever names a locale the list does not carry, the
    // switcher has nothing to display as current.
    expect(LANGUAGES.some((language) => language.code === DEFAULT_LOCALE)).toBe(
      true,
    );
  });

  it("names every language once", () => {
    const codes = LANGUAGES.map((language) => language.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("gives every language its own path", () => {
    // The list carries no path — a language's path is the current page's own
    // with the first segment swapped (`swapLocale` in `lib/i18n/paths.ts`). What
    // this pins is that the swap still tells the five apart: two languages
    // sharing a path would be two languages sharing a page.
    const hrefs = LANGUAGES.map((language) =>
      swapLocale("/en/shop", language.code),
    );
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
