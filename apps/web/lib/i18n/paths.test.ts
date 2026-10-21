import { describe, expect, it } from "vitest";
import { localePath, localeRedirectFor, swapLocale } from "./paths";

/**
 * The locale's place in a URL, which two ends of the app depend on agreeing
 * about: every link the storefront draws, and the proxy that answers a request
 * for a path with no language in it.
 */

describe("localePath", () => {
  it("puts the language in front of a path", () => {
    expect(localePath("de", "/shop")).toBe("/de/shop");
    expect(localePath("en", "/products/earbuds/earbud-wireless")).toBe(
      "/en/products/earbuds/earbud-wireless",
    );
  });

  it("makes the home page the language's own root, with no trailing slash", () => {
    expect(localePath("fr", "/")).toBe("/fr");
  });

  it("keeps a query string and a fragment where they belong", () => {
    // The locale goes in front of the path, not in front of the whole URL.
    expect(localePath("pt", "/shop?page=2&sort=price-asc")).toBe(
      "/pt/shop?page=2&sort=price-asc",
    );
    expect(localePath("es", "/shop#top")).toBe("/es/shop#top");
  });
});

describe("swapLocale", () => {
  it("sends the same page to another language", () => {
    // What the switcher's rows are built from: the language is a property of
    // the address, so changing it is not a trip back to the front door.
    expect(swapLocale("/en/shop", "de")).toBe("/de/shop");
    expect(swapLocale("/en/products/earbuds/studio-over-ear", "fr")).toBe(
      "/fr/products/earbuds/studio-over-ear",
    );
  });

  it("swaps a language's own root", () => {
    expect(swapLocale("/en", "es")).toBe("/es");
  });

  it("keeps the query parameters", () => {
    expect(swapLocale("/en/shop?page=3&sort=name-asc", "pt")).toBe(
      "/pt/shop?page=3&sort=name-asc",
    );
  });

  it("treats a path with no language as the default's", () => {
    // A bare path is what a browser never sees (the proxy redirects it) but an
    // internal caller can still hold: one language's path, swapped, is the
    // other language's path.
    expect(swapLocale("/shop", "de")).toBe("/de/shop");
    expect(swapLocale("/", "de")).toBe("/de");
  });

  it("leaves a path that merely looks like a language alone", () => {
    // `/shops` is not a language, and the first segment must be read whole.
    expect(swapLocale("/shops", "de")).toBe("/de/shops");
  });

  it("sends an empty path to the language's home", () => {
    // `usePathname()` is a string the framework fills in, and "" is a value it
    // can hold — the switcher renders in the header of every route, including
    // the ones that resolve after a suspension.
    expect(swapLocale("", "de")).toBe("/de");
  });
});

describe("localeRedirectFor", () => {
  it("sends a path with no language to the default one", () => {
    expect(localeRedirectFor("/")).toBe("/en");
    expect(localeRedirectFor("/shop")).toBe("/en/shop");
    expect(localeRedirectFor("/products/earbuds/studio-over-ear")).toBe(
      "/en/products/earbuds/studio-over-ear",
    );
  });

  it("leaves an addressed path alone", () => {
    // Every storefront path the proxy sees already has a language; a second
    // hop would be a redirect loop.
    for (const path of ["/en", "/en/shop", "/de", "/de/shop", "/es/products"]) {
      expect(localeRedirectFor(path)).toBeNull();
    }
  });

  it("sends an empty path to the default's home", () => {
    // Never a real request — the proxy's matcher needs a path to match — but
    // the answer is the same one any other unaddressed path gets, which is
    // what stops this from being a special case.
    expect(localeRedirectFor("")).toBe("/en");
  });

  it("does not special-case a language that does not exist", () => {
    // `/xx/shop` is a path whose first segment is not a language, which is the
    // same thing as any other unrecognised path: the default language's, which
    // matches no route and 404s. This function cannot know which segments name
    // routes, and guessing would be a second router.
    expect(localeRedirectFor("/xx/shop")).toBe("/en/xx/shop");
  });
});
