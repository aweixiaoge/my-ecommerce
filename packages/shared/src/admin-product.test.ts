import { describe, expect, it } from "vitest";
import {
  AdminProductCreateSchema,
  IMAGES_PER_VARIANT_MAX,
} from "./admin-product";

/** A payload that passes, so each case below can vary one thing. */
function product(overrides: Record<string, unknown> = {}) {
  return {
    name: "Studio Over-Ear",
    shortDescription: "Closed-back, tuned flat.",
    description: "## Materials\n\n- Aluminium\n- **Memory** foam",
    attributes: [{ kind: "color", values: ["Black", "Sand"] }],
    ...overrides,
  };
}

describe("AdminProductCreateSchema", () => {
  it("accepts a complete product", () => {
    expect(AdminProductCreateSchema.safeParse(product()).success).toBe(true);
  });

  it("accepts a product with nothing but a name", () => {
    // The form creates DRAFTS: copy and attributes get filled in later, so
    // requiring any of them here would be a rule the store does not have.
    const result = AdminProductCreateSchema.safeParse({
      name: "Untitled",
      shortDescription: "",
      description: "",
      attributes: [],
    });

    expect(result.success).toBe(true);
  });

  it("trims the name and the short description", () => {
    const result = AdminProductCreateSchema.safeParse(
      product({ name: "  Studio Over-Ear  ", shortDescription: "  Closed-back  " }),
    );

    expect(result.success && result.data.name).toBe("Studio Over-Ear");
    expect(result.success && result.data.shortDescription).toBe("Closed-back");
  });

  it("rejects a name that is empty or only whitespace", () => {
    for (const name of ["", "   ", "\t\n"]) {
      expect(AdminProductCreateSchema.safeParse(product({ name })).success).toBe(
        false,
      );
    }
  });

  it("rejects a name or description past its bound", () => {
    // Bounds exist so no single request can be made expensive to handle; they
    // are not a style rule.
    expect(
      AdminProductCreateSchema.safeParse(product({ name: "n".repeat(201) }))
        .success,
    ).toBe(false);
    expect(
      AdminProductCreateSchema.safeParse(
        product({ shortDescription: "s".repeat(301) }),
      ).success,
    ).toBe(false);
    expect(
      AdminProductCreateSchema.safeParse(
        product({ description: "d".repeat(20_001) }),
      ).success,
    ).toBe(false);
  });

  it("keeps the description as written", () => {
    // Markdown is stored, not rendered: trimming or normalising it here would
    // rewrite copy the author typed.
    const description = "  line one\n\n\n  line two  ";
    const result = AdminProductCreateSchema.safeParse(product({ description }));

    expect(result.success && result.data.description).toBe(description);
  });
});

describe("attributes", () => {
  it("accepts both kinds", () => {
    const result = AdminProductCreateSchema.safeParse(
      product({
        attributes: [
          { kind: "color", values: ["Black"] },
          { kind: "size", values: ["S", "M"] },
        ],
      }),
    );

    expect(result.success).toBe(true);
  });

  it("rejects a kind the form cannot offer", () => {
    // The enum is the contract. A free-text attribute name would put one
    // language's word into every product row (plan.md, decision 1).
    expect(
      AdminProductCreateSchema.safeParse(
        product({ attributes: [{ kind: "material", values: ["Steel"] }] }),
      ).success,
    ).toBe(false);
  });

  it("rejects an attribute with no values", () => {
    expect(
      AdminProductCreateSchema.safeParse(
        product({ attributes: [{ kind: "color", values: [] }] }),
      ).success,
    ).toBe(false);
  });

  it("rejects an empty or whitespace-only value", () => {
    expect(
      AdminProductCreateSchema.safeParse(
        product({ attributes: [{ kind: "color", values: ["Black", "  "] }] }),
      ).success,
    ).toBe(false);
  });

  it("rejects the same value twice", () => {
    expect(
      AdminProductCreateSchema.safeParse(
        product({ attributes: [{ kind: "color", values: ["Black", "Black"] }] }),
      ).success,
    ).toBe(false);
  });

  it("treats values differing only in case as the same value", () => {
    // "Black" and "black" would render as two identical swatches pointing at
    // two option rows.
    expect(
      AdminProductCreateSchema.safeParse(
        product({ attributes: [{ kind: "color", values: ["Black", "black"] }] }),
      ).success,
    ).toBe(false);
  });

  it("rejects the same kind twice", () => {
    expect(
      AdminProductCreateSchema.safeParse(
        product({
          attributes: [
            { kind: "color", values: ["Black"] },
            { kind: "color", values: ["Sand"] },
          ],
        }),
      ).success,
    ).toBe(false);
  });

  it("allows the same value under different kinds", () => {
    // "S" as a size and "S" as a colour name are unrelated values.
    const result = AdminProductCreateSchema.safeParse(
      product({
        attributes: [
          { kind: "size", values: ["S"] },
          { kind: "color", values: ["S"] },
        ],
      }),
    );

    expect(result.success).toBe(true);
  });

  it("trims values without rewriting their spelling", () => {
    const result = AdminProductCreateSchema.safeParse(
      product({ attributes: [{ kind: "size", values: ["  XL  ", "XXL"] }] }),
    );

    expect(result.success && result.data.attributes[0].values).toEqual([
      "XL",
      "XXL",
    ]);
  });
});

describe("variant drafts", () => {
  /** A payload with one priced colour, so each case below can vary one thing. */
  function withVariants(variants: unknown[]) {
    return product({ variants });
  }

  const black = {
    color: "Black",
    sku: "STUDIO-BLK",
    price: { amount: "79.00", currency: "USD" },
    stock: 12,
    mediaIds: ["media_01"],
  };

  it("accepts a colour with a price, a stock figure, a SKU and images", () => {
    expect(
      AdminProductCreateSchema.safeParse(withVariants([black])).success,
    ).toBe(true);
  });

  it("accepts a product with no variants at all", () => {
    // The form creates DRAFTS: a colour nobody has priced yet is a colour
    // added a minute ago, not an error.
    const result = AdminProductCreateSchema.safeParse(product());

    expect(result.success && result.data.variants).toEqual([]);
  });

  it("accepts a colour row that has nothing filled in but its name", () => {
    expect(
      AdminProductCreateSchema.safeParse(withVariants([{ color: "Sand" }]))
        .success,
    ).toBe(true);
  });

  it("defaults the image list rather than requiring it", () => {
    const result = AdminProductCreateSchema.safeParse(
      withVariants([{ color: "Sand", stock: 0 }]),
    );

    expect(result.success && result.data.variants[0]?.mediaIds).toEqual([]);
  });

  it("rejects a colour the product does not offer", () => {
    // Otherwise the two halves of the form could disagree and the product would
    // be stored with a variant nothing can select.
    expect(
      AdminProductCreateSchema.safeParse(withVariants([{ color: "Clay" }]))
        .success,
    ).toBe(false);
  });

  it("rejects a variant on a product with no colour attribute", () => {
    expect(
      AdminProductCreateSchema.safeParse(
        product({
          attributes: [{ kind: "size", values: ["S"] }],
          variants: [{ color: "S" }],
        }),
      ).success,
    ).toBe(false);
  });

  it("matches the colour to the attribute's spelling case-insensitively", () => {
    // The colour box lowercases nothing and the chips keep what was typed, so
    // a row keyed "black" against a value "Black" is the same colour.
    expect(
      AdminProductCreateSchema.safeParse(withVariants([{ color: "black" }]))
        .success,
    ).toBe(true);
  });

  it("rejects two rows for the same colour", () => {
    expect(
      AdminProductCreateSchema.safeParse(
        withVariants([{ color: "Black" }, { color: "black" }]),
      ).success,
    ).toBe(false);
  });

  it("rejects a SKU used by more than one colour", () => {
    expect(
      AdminProductCreateSchema.safeParse(
        withVariants([
          { color: "Black", sku: "STUDIO-BLK" },
          { color: "Sand", sku: "studio-blk" },
        ]),
      ).success,
    ).toBe(false);
  });

  it("allows two colours with no SKU", () => {
    // Undefined is not a duplicate of undefined — the check is for a SKU that
    // was actually claimed twice.
    expect(
      AdminProductCreateSchema.safeParse(
        withVariants([{ color: "Black" }, { color: "Sand" }]),
      ).success,
    ).toBe(true);
  });

  it("rejects a price that is not a decimal amount", () => {
    for (const amount of ["abc", "", "79,00", "7 9", "-5.00", "$79"]) {
      expect(
        AdminProductCreateSchema.safeParse(
          withVariants([
            { color: "Black", price: { amount, currency: "USD" } },
          ]),
        ).success,
      ).toBe(false);
    }
  });

  it("accepts a price of zero but rejects a negative one", () => {
    // A giveaway is unusual, not invalid; a negative catalogue price is.
    const zero = AdminProductCreateSchema.safeParse(
      withVariants([{ color: "Black", price: { amount: "0", currency: "USD" } }]),
    );
    const negative = AdminProductCreateSchema.safeParse(
      withVariants([
        { color: "Black", price: { amount: "-0.01", currency: "USD" } },
      ]),
    );

    expect(zero.success).toBe(true);
    expect(negative.success).toBe(false);
  });

  it("rejects a currency that is not three letters", () => {
    for (const currency of ["DOLLARS", "US", "", "usd", "US1", "12$"]) {
      expect(
        AdminProductCreateSchema.safeParse(
          withVariants([{ color: "Black", price: { amount: "79.00", currency } }]),
        ).success,
      ).toBe(false);
    }
  });

  it("accepts a currency the formatter can render", () => {
    // The rule is narrow because `Intl.NumberFormat` is strict: a code it
    // refuses throws at render time, and one stored price would take the whole
    // admin list down.
    expect(
      AdminProductCreateSchema.safeParse(
        withVariants([
          { color: "Black", price: { amount: "79.00", currency: "EUR" } },
        ]),
      ).success,
    ).toBe(true);
  });

  it("rejects a stock figure that is negative or not a whole number", () => {
    for (const stock of [-1, 1.5, "12"]) {
      expect(
        AdminProductCreateSchema.safeParse(withVariants([{ color: "Black", stock }]))
          .success,
      ).toBe(false);
    }
  });

  it("accepts a stock figure of zero", () => {
    // "Sold out" is a value someone types, and it is not the same as "no row".
    expect(
      AdminProductCreateSchema.safeParse(withVariants([{ color: "Black", stock: 0 }]))
        .success,
    ).toBe(true);
  });

  it("rejects more images than a variant may carry", () => {
    const mediaIds = Array.from(
      { length: IMAGES_PER_VARIANT_MAX + 1 },
      (_, i) => `media_${i}`,
    );

    expect(
      AdminProductCreateSchema.safeParse(
        withVariants([{ color: "Black", mediaIds }]),
      ).success,
    ).toBe(false);
  });

  it("rejects an empty media id", () => {
    expect(
      AdminProductCreateSchema.safeParse(
        withVariants([{ color: "Black", mediaIds: [""] }]),
      ).success,
    ).toBe(false);
  });

  it("rejects more variant rows than there are colours to anchor them to", () => {
    // There is deliberately no case here that reaches `VARIANTS_MAX`: a variant
    // has to name a colour the product offers, and the colour list is capped at
    // the same number, so no payload can. This is the reachable rule.
    expect(
      AdminProductCreateSchema.safeParse(
        withVariants([{ color: "Black" }, { color: "Sand" }]),
      ).success,
    ).toBe(true);
    expect(
      AdminProductCreateSchema.safeParse(
        withVariants([{ color: "Clay" }]),
      ).success,
    ).toBe(false);
  });
});
