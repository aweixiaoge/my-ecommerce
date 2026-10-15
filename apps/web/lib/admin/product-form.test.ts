import { describe, expect, it } from "vitest";
import { AdminProductCreateSchema } from "@my-ecommerce/shared";
import {
  availableKinds,
  nextAvailableKind,
  parseAttributeValues,
  serializeAttributes,
  type FormAttribute,
} from "./product-form";

describe("parseAttributeValues", () => {
  it("splits on commas", () => {
    expect(parseAttributeValues("S, M, L")).toEqual(["S", "M", "L"]);
  });

  it("splits on newlines too", () => {
    // A paste out of a spreadsheet arrives with one value per line.
    expect(parseAttributeValues("Black\nSand\nClay")).toEqual([
      "Black",
      "Sand",
      "Clay",
    ]);
  });

  it("trims each value and drops empty entries", () => {
    expect(parseAttributeValues("  S , M ,, L , ")).toEqual(["S", "M", "L"]);
  });

  it("ignores a trailing comma", () => {
    // Typing "S, M, L," and meaning three values is not a mistake worth
    // reporting back.
    expect(parseAttributeValues("S, M, L,")).toEqual(["S", "M", "L"]);
  });

  it("drops duplicates, keeping the spelling that came first", () => {
    // The schema refuses case-insensitive duplicates, so letting them through
    // here would turn a slip into an error the person cannot see or fix.
    expect(parseAttributeValues("Black, black, BLACK, Sand")).toEqual([
      "Black",
      "Sand",
    ]);
  });

  it("keeps values in the order they were typed", () => {
    expect(parseAttributeValues("XXL, S, M")).toEqual(["XXL", "S", "M"]);
  });

  it("returns nothing for an empty or separator-only input", () => {
    for (const raw of ["", "   ", ",", " , , "]) {
      expect(parseAttributeValues(raw)).toEqual([]);
    }
  });
});

describe("serializeAttributes", () => {
  it("sends the values as a list, parsed", () => {
    const attributes: FormAttribute[] = [
      { kind: "color", values: "Black, Sand" },
      { kind: "size", values: "S, M" },
    ];

    expect(JSON.parse(serializeAttributes(attributes))).toEqual([
      { kind: "color", values: ["Black", "Sand"] },
      { kind: "size", values: ["S", "M"] },
    ]);
  });

  it("leaves out a row with nothing in it", () => {
    // Adding a row and not filling it in means they changed their mind, not
    // that they want an option with no values — which the schema refuses.
    const attributes: FormAttribute[] = [
      { kind: "color", values: "Black" },
      { kind: "size", values: "   " },
    ];

    expect(JSON.parse(serializeAttributes(attributes))).toEqual([
      { kind: "color", values: ["Black"] },
    ]);
  });

  it("sends an empty list rather than nothing at all", () => {
    expect(serializeAttributes([])).toBe("[]");
  });

  it("produces attributes the shared schema accepts", () => {
    // The form and the contract have to agree without either importing the
    // other's internals; this is where they meet.
    const attributes: FormAttribute[] = [
      { kind: "color", values: "Black, black, Sand," },
      { kind: "size", values: "S\nM" },
    ];

    const result = AdminProductCreateSchema.safeParse({
      name: "Studio Over-Ear",
      shortDescription: "",
      description: "",
      attributes: JSON.parse(serializeAttributes(attributes)),
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.attributes).toEqual([
      { kind: "color", values: ["Black", "Sand"] },
      { kind: "size", values: ["S", "M"] },
    ]);
  });
});

describe("availableKinds", () => {
  it("offers the kinds no other row is using", () => {
    const attributes: FormAttribute[] = [{ kind: "color", values: "" }];

    expect(availableKinds(attributes, "size")).toEqual(["size"]);
  });

  it("keeps offering the row's own kind, without offering a kind in use", () => {
    // The rule is "every kind no other row is using", which is what makes the
    // row's own kind available for free and a taken one unavailable. Two rows,
    // two kinds: neither picker may cross over to the other's kind.
    const attributes: FormAttribute[] = [
      { kind: "color", values: "" },
      { kind: "size", values: "" },
    ];

    expect(availableKinds(attributes, "size")).toEqual(["size"]);
    expect(availableKinds(attributes, "color")).toEqual(["color"]);
  });
});

describe("nextAvailableKind", () => {
  it("offers the first free kind", () => {
    expect(nextAvailableKind([])).toBe("color");
    expect(nextAvailableKind([{ kind: "color", values: "" }])).toBe("size");
  });

  it("offers nothing once every kind is in use", () => {
    // The condition for the "Attribute" button being available at all.
    const attributes: FormAttribute[] = [
      { kind: "color", values: "" },
      { kind: "size", values: "" },
    ];

    expect(nextAvailableKind(attributes)).toBeNull();
  });
});
