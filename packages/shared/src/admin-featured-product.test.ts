import { describe, expect, it } from "vitest";
import { AdminFeaturedProductSchema } from "./admin-featured-product";

/** A payload that passes, so each case below can vary one thing. */
function toggle(overrides: Record<string, unknown> = {}) {
  return { id: "prod_1", featured: "featured", ...overrides };
}

describe("AdminFeaturedProductSchema", () => {
  it("accepts either state for a product id", () => {
    for (const featured of ["featured", "unfeatured"]) {
      expect(
        AdminFeaturedProductSchema.safeParse(toggle({ featured })).success,
      ).toBe(true);
    }
  });

  it("rejects a payload with no product", () => {
    // An empty id names no row, and "the first row" is not a product: the
    // screen always sends the one it rendered.
    expect(AdminFeaturedProductSchema.safeParse(toggle({ id: "" })).success).toBe(
      false,
    );
  });

  it("rejects an id past its bound", () => {
    expect(
      AdminFeaturedProductSchema.safeParse(toggle({ id: "p".repeat(65) }))
        .success,
    ).toBe(false);
  });

  it("rejects any word that is not one of the two states", () => {
    // The button labels are actions and the payload carries states; a schema
    // that accepted "Feature" would be storing a click rather than an outcome.
    for (const featured of ["Feature", "true", "on", "", true]) {
      expect(
        AdminFeaturedProductSchema.safeParse(toggle({ featured })).success,
      ).toBe(false);
    }
  });

  it("carries nothing but the id and the state", () => {
    // Whatever else a crafted POST sends is dropped, not stored: the order the
    // home page shows things in is the write side's to keep, and a payload
    // that could carry a position would let a form decide it.
    const result = AdminFeaturedProductSchema.safeParse(
      toggle({ position: 7, status: "active" }),
    );

    expect(result.success && result.data).toEqual({
      id: "prod_1",
      featured: "featured",
    });
  });
});
