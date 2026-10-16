import { describe, expect, it } from "vitest";
import {
  SLUG_ATTEMPTS,
  SlugExhaustedError,
  slugAttempt,
  slugify,
} from "./slug";

describe("slugify", () => {
  it("turns a name into the shape a URL can carry", () => {
    expect(slugify("Studio Over-Ear")).toBe("studio-over-ear");
  });

  it("folds an accent onto its base letter rather than dropping the letter", () => {
    // "caf" would be a different word, and it is what a naive strip leaves.
    expect(slugify("Café")).toBe("cafe");
    expect(slugify("Ĥéllo")).toBe("hello");
  });

  it("collapses runs of anything else into one dash", () => {
    // The dashes are the join, so a name full of punctuation must not produce
    // "studio---over--ear".
    expect(slugify("Studio   --  Over??Ear")).toBe("studio-over-ear");
  });

  it("does not leave a dash at either end", () => {
    // A trailing dash is not a separator, it is a character the URL has to
    // carry for no reason.
    expect(slugify("  !Studio Over-Ear!  ")).toBe("studio-over-ear");
  });

  it("keeps digits, which are as good a name as letters", () => {
    expect(slugify("Aerophone 2026")).toBe("aerophone-2026");
  });

  it("has a fallback for a name that keeps nothing", () => {
    // A name in a script with no ASCII, or one made entirely of punctuation.
    // The unique constraint means "nothing" is not an option — two products
    // would both want the empty slug.
    expect(slugify("日本語")).toBe("product");
    expect(slugify("!!!")).toBe("product");
    expect(slugify("   ")).toBe("product");
  });

  it("lets the caller say what the fallback word is", () => {
    // The fallback is the entity's: a category called "!!!" belongs at
    // /categories/category, not at /categories/product.
    expect(slugify("日本語", "category")).toBe("category");
    expect(slugify("!!!", "category")).toBe("category");
  });
});

describe("SlugExhaustedError", () => {
  it("names the word it ran out of slugs for", () => {
    // The message is written for the person who typed the name, and it is the
    // only thing that tells them which of their rows collided 100 times.
    const error = new SlugExhaustedError("studio-over-ear");

    expect(error.message).toBe(
      'Could not find a free slug for "studio-over-ear".',
    );
    expect(error.name).toBe("SlugExhaustedError");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("slugAttempt", () => {
  it("uses the slug itself for the first attempt", () => {
    expect(slugAttempt("studio-over-ear", 1)).toBe("studio-over-ear");
  });

  it("numbers from two, not from one", () => {
    // "studio-over-ear-1" reads as the first of something, but it is the second
    // product to want the name.
    expect(slugAttempt("studio-over-ear", 2)).toBe("studio-over-ear-2");
    expect(slugAttempt("studio-over-ear", 100)).toBe("studio-over-ear-100");
  });

  it("mints a different slug for every attempt up to the bound", () => {
    const slugs = Array.from({ length: SLUG_ATTEMPTS }, (_, i) =>
      slugAttempt("product", i + 1),
    );

    expect(new Set(slugs).size).toBe(SLUG_ATTEMPTS);
  });
});
