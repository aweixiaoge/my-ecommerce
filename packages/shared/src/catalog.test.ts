import { describe, expect, it } from "vitest";
import { ProductRatingSchema, ProductSortSchema } from "./catalog";

describe("ProductRatingSchema", () => {
  it("accepts an average between zero and five with a whole review count", () => {
    expect(ProductRatingSchema.safeParse({ average: 4.2, count: 98 }).success).toBe(true);
  });

  it("accepts the endpoints and a product nobody has reviewed", () => {
    for (const average of [0, 5]) {
      expect(ProductRatingSchema.safeParse({ average, count: 0 }).success).toBe(true);
    }
  });

  it("rejects an average outside the five-star scale", () => {
    // Above five is not a rounding detail — it is a star row that overflows.
    for (const average of [-0.1, 5.1, 100]) {
      expect(ProductRatingSchema.safeParse({ average, count: 1 }).success).toBe(false);
    }
  });

  it("rejects a fractional or negative review count", () => {
    for (const count of [1.5, -1]) {
      expect(ProductRatingSchema.safeParse({ average: 3, count }).success).toBe(false);
    }
  });
});

describe("ProductSortSchema", () => {
  it("accepts every order the list endpoint implements", () => {
    for (const sort of ["default", "price-asc", "price-desc", "name-asc"]) {
      expect(ProductSortSchema.safeParse(sort).success).toBe(true);
    }
  });

  it("rejects an order the endpoint does not implement", () => {
    // An unknown sort must fail loudly here rather than fall through to the
    // database as a column name.
    for (const sort of ["", "price", "PRICE-ASC", "name desc"]) {
      expect(ProductSortSchema.safeParse(sort).success).toBe(false);
    }
  });
});
