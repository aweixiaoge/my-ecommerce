import { describe, expect, it } from "vitest";
import { paginate } from "./common";

const items = Array.from({ length: 13 }, (_, i) => i + 1);

describe("paginate", () => {
  it("returns the requested slice and the envelope describing it", () => {
    const result = paginate(items, 2, 12);

    expect(result.items).toEqual([13]);
    expect(result.pagination).toEqual({
      page: 2,
      perPage: 12,
      total: 13,
      totalPages: 2,
    });
  });

  it("returns the first page when the page is missing or nonsense", () => {
    for (const page of [0, -3, Number.NaN, Number.POSITIVE_INFINITY, 0.4]) {
      expect(paginate(items, page, 12).pagination.page).toBe(1);
    }
  });

  it("clamps a page past the end instead of returning an empty grid", () => {
    // A stale link. The shopper gets the last page, not nothing.
    const result = paginate(items, 99, 12);

    expect(result.pagination.page).toBe(2);
    expect(result.items).toEqual([13]);
  });

  it("leaves an in-range page alone and serves that page's items", () => {
    const second = paginate(items, 2, 12);

    expect(second.pagination.page).toBe(2);
    expect(second.items).toEqual([13]);
  });

  it("treats fractional pages as their integer part", () => {
    expect(paginate(items, 2.9, 12).pagination.page).toBe(2);
  });

  it("describes an empty list as one empty page with no pages", () => {
    const result = paginate([], 1, 12);

    expect(result.items).toEqual([]);
    expect(result.pagination).toEqual({
      page: 1,
      perPage: 12,
      total: 0,
      totalPages: 0,
    });
  });

  it("stays on page one when a filtered list shrinks under the current page", () => {
    const result = paginate([1, 2, 3], 4, 12);

    expect(result.pagination.page).toBe(1);
    expect(result.items).toEqual([1, 2, 3]);
  });

  it("slices exactly one full page when the total divides evenly", () => {
    const result = paginate(items.slice(0, 12), 1, 12);

    expect(result.items).toHaveLength(12);
    expect(result.pagination.totalPages).toBe(1);
  });

  it("does not mutate the list it is given", () => {
    const original = [...items];
    paginate(items, 2, 12);
    expect(items).toEqual(original);
  });
});
