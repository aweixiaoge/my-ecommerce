import { describe, expect, it } from "vitest";
import { toFormAttributes, toFormDrafts } from "./product-edit";

/**
 * A stored product, in the units the create form holds.
 *
 * This is the whole of the difference between the create screen and the edit
 * screen, so it is worth being exact about: if a price came back as a number,
 * or a colour as a list, the form would need a second code path and the two
 * screens would start drifting.
 */
const attributes = [
  {
    id: "opt_1",
    kind: "color" as const,
    values: [
      { id: "val_1", name: "Black", variants: 1 },
      { id: "val_2", name: "Sand", variants: 0 },
    ],
  },
  { id: "opt_2", kind: "size" as const, values: [{ id: "val_3", name: "M", variants: 0 }] },
];

describe("toFormAttributes", () => {
  it("puts a colour's values back in the one box they came from", () => {
    // The create form holds values as one comma-separated string, because that
    // is what a person types. Editing shows the same box.
    expect(toFormAttributes(attributes)).toEqual([
      { kind: "color", values: "Black, Sand" },
      { kind: "size", values: "M" },
    ]);
  });

  it("keeps the order the options are offered in", () => {
    expect(toFormAttributes(attributes).map((option) => option.kind)).toEqual([
      "color",
      "size",
    ]);
  });

  it("is empty for a product offered in nothing", () => {
    expect(toFormAttributes([])).toEqual([]);
  });
});

describe("toFormDrafts", () => {
  it("keys each colour's row the way the form keys it", () => {
    const drafts = toFormDrafts([
      {
        color: "  Black ",
        sku: "STUDIO-BLK",
        price: "79.00",
        stock: "12",
        mediaIds: ["media_1", "media_2"],
      },
    ]);

    // Trimmed and lowercased, so the row is found by whatever the values box
    // spells it as.
    expect(drafts["black"]).toEqual({
      sku: "STUDIO-BLK",
      price: "79.00",
      stock: "12",
      mediaIds: ["media_1", "media_2"],
      saved: true,
    });
  });

  it("marks a loaded row as one the database already has", () => {
    // The difference between a row somebody emptied and a colour nobody has
    // filled in: the first has a variant and saving has to write the cleared
    // price; the second is skipped, and a typed colour does not become an empty
    // variant.
    const [draft] = Object.values(
      toFormDrafts([
        { color: "Black", sku: "", price: "", stock: "", mediaIds: [] },
      ]),
    );

    expect(draft?.saved).toBe(true);
  });

  it("does not copy the image list it was handed", () => {
    // The form edits this list in place as images are moved and removed; a
    // shared array would edit the product it was loaded from.
    const mediaIds = ["media_1"];
    const drafts = toFormDrafts([
      { color: "Black", sku: "", price: "", stock: "", mediaIds },
    ]);

    drafts["black"]!.mediaIds.push("media_2");

    expect(mediaIds).toEqual(["media_1"]);
  });

  it("skips a variant with no colour to key it by", () => {
    // Not a state this app writes — a variant is selected by an option value —
    // but a row that got in some other way should not become a row named "".
    expect(
      toFormDrafts([
        { color: "", sku: "X", price: "", stock: "0", mediaIds: [] },
      ]),
    ).toEqual({});
  });

  it("is empty for a product with no variants", () => {
    expect(toFormDrafts([])).toEqual({});
  });
});
