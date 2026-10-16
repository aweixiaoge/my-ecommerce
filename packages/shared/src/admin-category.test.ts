import { describe, expect, it } from "vitest";
import { AdminCategoryCreateSchema } from "./admin-category";

/** A payload that passes, so each case below can vary one thing. */
function category(overrides: Record<string, unknown> = {}) {
  return { name: "Headphones", ...overrides };
}

describe("AdminCategoryCreateSchema", () => {
  it("accepts a category with a name", () => {
    expect(AdminCategoryCreateSchema.safeParse(category()).success).toBe(true);
  });

  it("trims the name", () => {
    // The trimmed value is what the slug is made from, so "  Headphones  " and
    // "Headphones" have to be one category rather than two.
    const result = AdminCategoryCreateSchema.safeParse(
      category({ name: "  Headphones  " }),
    );

    expect(result.success && result.data.name).toBe("Headphones");
  });

  it("rejects a name that is empty or only whitespace", () => {
    for (const name of ["", "   ", "\t\n"]) {
      expect(AdminCategoryCreateSchema.safeParse(category({ name })).success).toBe(
        false,
      );
    }
  });

  it("rejects a name past its bound, and keeps the one at it", () => {
    // Bounds exist so no single request can be made expensive to handle; they
    // are not a style rule.
    expect(
      AdminCategoryCreateSchema.safeParse(category({ name: "n".repeat(201) }))
        .success,
    ).toBe(false);
    expect(
      AdminCategoryCreateSchema.safeParse(category({ name: "n".repeat(200) }))
        .success,
    ).toBe(true);
  });

  it("carries nothing but the name", () => {
    // The slug and the place in the tree are the write side's to decide, and a
    // payload that could carry either would let a crafted POST put a category
    // where no screen offers to put one. They are dropped, not rejected:
    // stripping unknown keys is Zod's default, and the schema says so here.
    const result = AdminCategoryCreateSchema.safeParse(
      category({ slug: "shoes", parentId: "cat_1", position: 7 }),
    );

    expect(result.success && result.data).toEqual({ name: "Headphones" });
  });
});
