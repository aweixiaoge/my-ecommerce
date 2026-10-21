import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TranslationNotice } from "./translation-notice";

/**
 * The line a list shows after a save.
 *
 * Rendered to markup rather than driven: it has no state, no handlers and one
 * decision — whether the value it was given is one of the four words.
 */
describe("TranslationNotice", () => {
  it("says what happened for each of the four outcomes", () => {
    for (const [value, expected] of [
      ["ok", "translated into German, French, Portuguese and Spanish"],
      ["partial", "Some languages could not be translated"],
      ["failed", "the translation failed"],
      ["off", "DEEPL_API_KEY"],
    ] as const) {
      const markup = renderToStaticMarkup(<TranslationNotice value={value} />);

      expect(markup).toContain(expected);
      expect(markup).toContain('role="status"');
    }
  });

  it("draws nothing on an ordinary visit", () => {
    // The parameter is absent unless a create just redirected with one, and a
    // list that apologised for translations on every visit would be noise.
    expect(renderToStaticMarkup(<TranslationNotice value={undefined} />)).toBe("");
  });

  it("draws nothing for a value it does not know", () => {
    // A hand-edited URL is not a state to report; inventing a sentence for it
    // would be the page telling somebody something that did not happen.
    for (const value of ["saved", "OK", ""]) {
      expect(renderToStaticMarkup(<TranslationNotice value={value} />)).toBe("");
    }
  });
});
