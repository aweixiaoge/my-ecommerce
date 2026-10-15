import { describe, expect, it } from "vitest";
import { AdminProductCreateSchema } from "./admin-product";

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
