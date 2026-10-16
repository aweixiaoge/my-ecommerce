import { describe, expect, it } from "vitest";
import { AdminProductCreateSchema } from "@my-ecommerce/shared";
import {
  addMediaId,
  colorKey,
  draftFor,
  draftProblems,
  emptyDraft,
  hasProblems,
  moveMediaId,
  parseAmount,
  parseStock,
  priceRange,
  removeMediaId,
  serializeVariants,
  type FormColorDraft,
} from "./product-variants";

function draft(overrides: Partial<FormColorDraft> = {}): FormColorDraft {
  return { ...emptyDraft(), ...overrides };
}

/** The payload, parsed back — JSON is a string and string-matching it proves nothing. */
function serialized(
  drafts: Record<string, FormColorDraft>,
  colors: readonly string[],
): unknown[] {
  return JSON.parse(serializeVariants(drafts, colors));
}

describe("colorKey", () => {
  it("finds a colour however it was typed the second time", () => {
    // The row keeps its photographs when the box is re-typed with a stray
    // space or a different case.
    expect(colorKey("  Black ")).toBe("black");
  });
});

describe("parseAmount", () => {
  it("reads an amount as the string the contract carries", () => {
    // Never a number: money.ts is explicit that a decimal goes over the wire as
    // text, and 19.99 as a float is the precision loss the string prevents.
    expect(parseAmount("79.00")).toBe("79.00");
    expect(parseAmount("  12 ")).toBe("12");
  });

  it("calls an empty box empty, not invalid", () => {
    // Different answers: one is a draft, the other is a mistake to report.
    expect(parseAmount("   ")).toBeUndefined();
  });

  it("refuses anything that is not an amount", () => {
    for (const raw of ["abc", "79,00", "-5", "$79", "1e3", "7.9.9"]) {
      expect(parseAmount(raw)).toBeNull();
    }
  });
});

describe("parseStock", () => {
  it("counts whole units", () => {
    expect(parseStock("0")).toBe(0);
    expect(parseStock(" 12 ")).toBe(12);
  });

  it("calls an empty box empty", () => {
    expect(parseStock("")).toBeUndefined();
  });

  it("refuses a figure that is not a whole number of units", () => {
    // `Number("1e3")` is a thousand and `Number(" ")` is zero — accepting
    // either would store a stock figure nobody typed.
    for (const raw of ["1e3", "1.5", "-1", "12a", "1 2"]) {
      expect(parseStock(raw)).toBeNull();
    }
  });
});

describe("draftProblems", () => {
  it("says nothing about a row nobody has filled in", () => {
    expect(draftProblems(draft())).toEqual({});
  });

  it("names the field that is wrong", () => {
    const problems = draftProblems(draft({ price: "abc", stock: "1.5" }));

    expect(problems.price).toContain("79.00");
    expect(problems.stock).toContain("whole number");
  });

  it("is about the pair, so a half-typed row is not an error", () => {
    expect(draftProblems(draft({ price: "7", stock: "0" }))).toEqual({});
  });
});

describe("hasProblems", () => {
  it("is true when one declared colour is wrong", () => {
    const drafts = { black: draft({ price: "abc" }) };

    expect(hasProblems(drafts, ["Black"])).toBe(true);
  });

  it("ignores a draft whose colour is no longer declared", () => {
    // The row is not on screen and will not be submitted, so it cannot be
    // holding up the form.
    expect(hasProblems({ black: draft({ price: "abc" }) }, ["Sand"])).toBe(false);
  });

  it("is false when everything declared is fine", () => {
    expect(hasProblems({}, ["Black"])).toBe(false);
  });
});

describe("draftFor", () => {
  it("hands back a blank row for a colour nobody has touched", () => {
    expect(draftFor({}, "Black")).toEqual(emptyDraft());
  });

  it("finds the row by the canonical key", () => {
    const drafts = { black: draft({ sku: "S-1" }) };

    expect(draftFor(drafts, " BLACK ").sku).toBe("S-1");
  });

  it("hands back a blank row for a colour named after an object prototype member", () => {
    // The key is whatever someone typed into the colour box. A plain lookup
    // finds `Object.prototype.constructor` — a function, not a draft — and the
    // next property read off it throws during render, which unmounts the route
    // and loses everything else in the form.
    for (const name of ["constructor", "__proto__", "toString", "valueOf"]) {
      expect(() => draftFor({}, name)).not.toThrow();
      expect(draftFor({}, name)).toEqual(emptyDraft());
      expect(draftProblems(draftFor({}, name))).toEqual({});
    }
  });
});

describe("media order", () => {
  it("appends an uploaded image", () => {
    expect(addMediaId(["media_01"], "media_02")).toEqual(["media_01", "media_02"]);
  });

  it("moves an image towards the front", () => {
    expect(moveMediaId(["a", "b", "c"], "c", -1)).toEqual(["a", "c", "b"]);
  });

  it("moves an image towards the back", () => {
    expect(moveMediaId(["a", "b", "c"], "a", 1)).toEqual(["b", "a", "c"]);
  });

  it("leaves the order alone at either end", () => {
    // The buttons that call this are the ones that are disabled, so this is the
    // belt to that pair of braces — and the reason they need no bounds check.
    expect(moveMediaId(["a", "b"], "a", -1)).toEqual(["a", "b"]);
    expect(moveMediaId(["a", "b"], "b", 1)).toEqual(["a", "b"]);
  });

  it("leaves the order alone for an image that is not there", () => {
    expect(moveMediaId(["a"], "gone", 1)).toEqual(["a"]);
  });

  it("does not edit the list it was handed", () => {
    const ids = ["a", "b"];
    moveMediaId(ids, "a", 1);

    expect(ids).toEqual(["a", "b"]);
  });

  it("removes an image from wherever it is", () => {
    expect(removeMediaId(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });

  it("ignores a removal of something that is not there", () => {
    expect(removeMediaId(["a"], "gone")).toEqual(["a"]);
  });
});

describe("serializeVariants", () => {
  it("carries the price, stock, SKU and image order", () => {
    const drafts = {
      black: draft({
        sku: "STUDIO-BLK",
        price: "79.00",
        stock: "12",
        mediaIds: ["media_02", "media_01"],
      }),
    };

    expect(serialized(drafts, ["Black"])).toEqual([
      {
        color: "Black",
        sku: "STUDIO-BLK",
        price: { amount: "79.00", currency: "USD" },
        stock: 12,
        mediaIds: ["media_02", "media_01"],
      },
    ]);
  });

  it("keeps a stock figure of zero", () => {
    // "Sold out" is something someone typed; dropping it would turn a sold-out
    // colour into an unpriced one.
    expect(serialized({ black: draft({ stock: "0" }) }, ["Black"])).toEqual([
      { color: "Black", stock: 0, mediaIds: [] },
    ]);
  });

  it("leaves out a colour nobody has filled in", () => {
    // The colour is already in the attribute list; repeating it here would make
    // a variant out of every colour anyone typed.
    expect(serialized({}, ["Black", "Sand"])).toEqual([]);
  });

  it("leaves out a colour that is no longer declared", () => {
    const drafts = { black: draft({ sku: "S-1", mediaIds: ["media_01"] }) };

    expect(serialized(drafts, ["Sand"])).toEqual([]);
  });

  it("emits the colours in the order the box lists them", () => {
    const drafts = {
      sand: draft({ sku: "S-2" }),
      black: draft({ sku: "S-1" }),
    };

    expect(
      (serialized(drafts, ["Black", "Sand"]) as { color: string }[]).map(
        (variant) => variant.color,
      ),
    ).toEqual(["Black", "Sand"]);
  });

  it("keeps a colour's spelling rather than the key it is stored under", () => {
    expect(serialized({}, ["  Sky Blue  "])).toEqual([]);
    expect(serialized({ "sky blue": draft({ sku: "S-3" }) }, ["Sky Blue"])).toEqual(
      [{ color: "Sky Blue", sku: "S-3", mediaIds: [] }],
    );
  });

  it("trims a SKU and drops an empty one", () => {
    const variants = serialized({ black: draft({ sku: "  ", stock: "1" }) }, ["Black"]);

    expect(variants).toEqual([{ color: "Black", stock: 1, mediaIds: [] }]);
  });

  it("produces variants the shared schema accepts", () => {
    // The two halves of the form meet here: what the form assembles has to be
    // what the action's validator takes, or the failure is a dead submit button
    // rather than a message.
    const result = AdminProductCreateSchema.safeParse({
      name: "Studio Over-Ear",
      shortDescription: "",
      description: "",
      categoryId: "cat_1",
      attributes: [{ kind: "color", values: ["Black", "Sand"] }],
      variants: serialized(
        {
          black: draft({ sku: "S-1", price: "79.00", stock: "12", mediaIds: ["media_01"] }),
          sand: draft({ price: "79.00" }),
        },
        ["Black", "Sand"],
      ),
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.variants).toHaveLength(2);
  });
});

describe("priceRange", () => {
  const usd = (amount: string) => ({ amount, currency: "USD" });

  it("spans the cheapest and dearest price", () => {
    expect(priceRange([usd("89.00"), usd("79.00")])).toEqual({
      min: usd("79.00"),
      max: usd("89.00"),
    });
  });

  it("gives one figure when every price is the same", () => {
    // The list renders a range only when the two differ; equal ends are how it
    // is told there is nothing to show.
    expect(priceRange([usd("79.00"), usd("79.00")])).toEqual({
      min: usd("79.00"),
      max: usd("79.00"),
    });
  });

  it("has nothing to say when nothing is priced", () => {
    // Not "$0.00", which reads as free.
    expect(priceRange([])).toBeNull();
  });

  it("orders amounts as decimals rather than as numbers", () => {
    // 100 sorts below 99 as text, and above it as a price.
    expect(priceRange([usd("100.00"), usd("99.00")])?.min.amount).toBe("99.00");
  });

  it("does not take the page down for mixed currencies", () => {
    // `compareMoney` throws rather than ordering amounts with no relation, and
    // nothing here can produce this — but a direct POST can, and an admin list
    // that 500s on one bad row is worse than one that shows a narrower range.
    const range = priceRange([
      usd("79.00"),
      { amount: "70.00", currency: "EUR" },
    ]);

    expect(range).toEqual({ min: usd("79.00"), max: usd("79.00") });
  });
});
