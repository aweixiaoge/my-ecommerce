import { describe, expect, it } from "vitest";
import { fill, plural } from "./format";

describe("fill", () => {
  it("puts values where the placeholders are", () => {
    expect(
      fill("Showing {from}–{to} of {total} results", {
        from: 1,
        to: 12,
        total: 13,
      }),
    ).toBe("Showing 1–12 of 13 results");
  });

  it("takes a number as readily as a string", () => {
    expect(fill("Reviews ({count})", { count: 3 })).toBe("Reviews (3)");
  });

  it("replaces every occurrence of the same placeholder", () => {
    expect(fill("{name} and {name}", { name: "Onyx" })).toBe("Onyx and Onyx");
  });

  it("leaves a placeholder with no value as it stands", () => {
    // A missing value is a bug in the call, and `{total}` in a sentence says so
    // where an empty string would hide it.
    expect(fill("of {total} results", { from: 1 })).toBe("of {total} results");
  });

  it("leaves a sentence with no placeholders alone", () => {
    expect(fill("From the journal", {})).toBe("From the journal");
  });
});

describe("plural", () => {
  const forms = { one: "{count} review", other: "{count} reviews" };

  it("chooses the singular for exactly one", () => {
    expect(plural(1, forms)).toBe("1 review");
  });

  it("chooses the plural for zero, and for everything above one", () => {
    // Zero takes the plural in all five of this storefront's languages, which
    // is why there are two forms and not three.
    expect(plural(0, forms)).toBe("0 reviews");
    expect(plural(2, forms)).toBe("2 reviews");
    expect(plural(11, forms)).toBe("11 reviews");
  });

  it("fills other placeholders alongside the count", () => {
    expect(
      plural(2, { one: "{count} review for {product}", other: "{count} reviews for {product}" }, {
        product: "Studio Over-Ear",
      }),
    ).toBe("2 reviews for Studio Over-Ear");
  });

  it("lets an explicit value win over the count", () => {
    // The count is filled first and then overridden, so a caller that needs a
    // formatted number — "1,5" in German — can say so.
    expect(plural(2, forms, { count: "zwei" })).toBe("zwei reviews");
  });
});
