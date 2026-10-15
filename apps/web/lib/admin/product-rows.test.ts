import { describe, expect, it } from "vitest";
import type { AdminProductCreate, VariantDraft } from "@my-ecommerce/shared";
import {
  DEFAULT_LOCALE,
  productCreateData,
  variantCreateData,
  variantDraftsByName,
} from "./product-rows";

/** A payload the shared schema would have accepted. */
function payload(overrides: Partial<AdminProductCreate> = {}): AdminProductCreate {
  return {
    name: "Studio Over-Ear",
    shortDescription: "Closed-back, tuned flat.",
    description: "## Materials",
    attributes: [
      { kind: "color", values: ["Black", "Sand"] },
      { kind: "size", values: ["S", "M"] },
    ],
    variants: [],
    ...overrides,
  };
}

function draft(overrides: Partial<VariantDraft> = {}): VariantDraft {
  return { color: "Black", mediaIds: [], ...overrides };
}

describe("productCreateData", () => {
  it("writes a draft, never something for sale", () => {
    // Nothing this form collects has been checked or published, and plan.md's
    // statuses exist so that going live is a deliberate act.
    expect(productCreateData(payload(), "studio-over-ear").status).toBe("draft");
  });

  it("puts the name, copy and slug in the locale's translation row", () => {
    // The shape plan.md calls expensive to reverse: a product is not one row,
    // and English lives in a translation rather than in a column of its own.
    const data = productCreateData(payload(), "studio-over-ear");

    expect(data.translations).toEqual({
      create: {
        locale: DEFAULT_LOCALE,
        name: "Studio Over-Ear",
        slug: "studio-over-ear",
        shortDescription: "Closed-back, tuned flat.",
        description: "## Materials",
      },
    });
  });

  it("stores an option's name as the translation of its kind", () => {
    // "Colour" is what `color` is called in English, and the translation row is
    // where a language's word for something belongs (plan.md, decision 1).
    const data = productCreateData(payload(), "studio-over-ear");

    const options = data.options?.create as {
      position: number;
      translations: { create: { name: string } };
    }[];

    expect(options.map((option) => option.translations.create.name)).toEqual([
      "Color",
      "Size",
    ]);
  });

  it("keeps the order the attributes and their values were typed in", () => {
    // `position` is the order they are offered on the product page, and the
    // only record of it — an unordered insert would shuffle the swatches.
    const data = productCreateData(payload(), "studio-over-ear");

    const options = data.options?.create as {
      position: number;
      values: { create: { position: number; translations: { create: { name: string } } }[] };
    }[];

    expect(options.map((option) => option.position)).toEqual([0, 1]);
    expect(
      options[0]!.values.create.map((value) => value.translations.create.name),
    ).toEqual(["Black", "Sand"]);
    expect(options[0]!.values.create.map((value) => value.position)).toEqual([
      0, 1,
    ]);
  });

  it("creates no options for a product with no attributes", () => {
    const data = productCreateData(payload({ attributes: [] }), "untitled");

    expect(data.options).toEqual({ create: [] });
  });
});

describe("variantDraftsByName", () => {
  it("finds a draft by the colour however either was typed", () => {
    // The two halves of the payload were allowed to differ in spelling, so the
    // lookup has to be the canonical form of both.
    const drafts = variantDraftsByName([draft({ color: "  Black " })]);

    expect(drafts.get("black")?.color).toBe("  Black ");
  });

  it("keeps the last of two drafts for one colour", () => {
    // The schema refuses duplicates, so this is about not dropping one
    // silently if it ever got through.
    const drafts = variantDraftsByName([
      draft({ color: "Black", sku: "A" }),
      draft({ color: "black", sku: "B" }),
    ]);

    expect(drafts.size).toBe(1);
    expect(drafts.get("black")?.sku).toBe("B");
  });

  it("is empty for a product with no variants", () => {
    expect(variantDraftsByName([]).size).toBe(0);
  });
});

describe("variantCreateData", () => {
  it("writes what the row said", () => {
    const data = variantCreateData(
      draft({
        sku: "STUDIO-BLK",
        price: { amount: "79.00", currency: "USD" },
        stock: 12,
      }),
      "val_1",
    );

    expect(data).toMatchObject({
      sku: "STUDIO-BLK",
      priceAmount: "79.00",
      priceCurrency: "USD",
      stock: 12,
      status: "draft",
    });
  });

  it("leaves an unpriced colour unpriced rather than free", () => {
    // "0.00" is a price, and it says the product costs nothing. A draft nobody
    // has costed has no price.
    const data = variantCreateData(draft(), "val_1");

    expect(data.priceAmount).toBeNull();
    expect(data.priceCurrency).toBeNull();
  });

  it("leaves a colour with no SKU without one", () => {
    expect(variantCreateData(draft(), "val_1").sku).toBeNull();
  });

  it("counts an unstated stock as none", () => {
    // The safe direction, and the column's own default. Zero is also the one
    // figure a person could have typed and meant, which is why the form sends
    // it explicitly rather than relying on this.
    expect(variantCreateData(draft(), "val_1").stock).toBe(0);
    expect(variantCreateData(draft({ stock: 0 }), "val_1").stock).toBe(0);
  });

  it("hangs the variant off the option value that selects it", () => {
    expect(variantCreateData(draft(), "val_1").optionValues).toEqual({
      create: { optionValueId: "val_1" },
    });
  });
});
