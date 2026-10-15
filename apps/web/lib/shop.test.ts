import { describe, expect, it } from "vitest";
import type { Pagination, ProductSummary } from "@my-ecommerce/shared";
import {
  pageNumbers,
  parseShopQuery,
  resultsLabel,
  shopHref,
  sortProducts,
} from "./shop";

const pagination = (over: Partial<Pagination> = {}): Pagination => ({
  page: 1,
  perPage: 12,
  total: 13,
  totalPages: 2,
  ...over,
});

/** Only the fields `sortProducts` reads are populated; the rest is context. */
const product = (name: string, amount: string): ProductSummary =>
  ({
    id: `prod_${name}`,
    slug: name.toLowerCase(),
    name,
    price: { amount, currency: "USD" },
    priceMax: null,
    compareAtPrice: null,
    image: null,
    inStock: true,
    categories: [],
    rating: null,
  }) satisfies ProductSummary;

describe("parseShopQuery", () => {
  it("reads a page and a sort off the URL", () => {
    expect(parseShopQuery({ page: "2", sort: "price-asc" })).toEqual({
      page: 2,
      sort: "price-asc",
    });
  });

  it("falls back to page one and the default order when nothing is given", () => {
    expect(parseShopQuery({})).toEqual({ page: 1, sort: "default" });
  });

  it("falls back rather than propagating junk into the query", () => {
    // Anything but a positive integer would reach the database as a LIMIT or
    // OFFSET, so it is replaced here instead of being clamped later.
    for (const page of ["0", "-4", "abc", "", " "]) {
      expect(parseShopQuery({ page }).page).toBe(1);
    }
  });

  it("accepts a page with trailing junk the way parseInt does", () => {
    // "2x" is not worth an error page; it is unambiguously page two.
    expect(parseShopQuery({ page: "2x" }).page).toBe(2);
    expect(parseShopQuery({ page: "2.5.1" }).page).toBe(2);
  });

  it("takes the first value when a parameter is repeated", () => {
    expect(parseShopQuery({ page: ["3", "1"], sort: ["name-asc", "price-asc"] })).toEqual({
      page: 3,
      sort: "name-asc",
    });
  });

  it("rejects a sort the endpoint does not implement", () => {
    for (const sort of ["price", "PRICE-ASC", "name desc", "1"]) {
      expect(parseShopQuery({ sort }).sort).toBe("default");
    }
  });
});

describe("sortProducts", () => {
  const catalogue = [
    product("Zephyr", "30.00"),
    product("Alpha", "9.50"),
    product("Mid", "9.50"),
    product("Beta", "100.00"),
  ];

  it("leaves the catalogue order alone for the default sort", () => {
    const sorted = sortProducts(catalogue, "default");
    expect(sorted.map((p) => p.name)).toEqual(["Zephyr", "Alpha", "Mid", "Beta"]);
  });

  it("orders by price ascending, comparing decimal strings rather than floats", () => {
    const sorted = sortProducts(catalogue, "price-asc");
    expect(sorted.map((p) => p.price.amount)).toEqual(["9.50", "9.50", "30.00", "100.00"]);
  });

  it("orders by price descending", () => {
    const sorted = sortProducts(catalogue, "price-desc");
    expect(sorted.map((p) => p.price.amount)).toEqual(["100.00", "30.00", "9.50", "9.50"]);
  });

  it("orders by name", () => {
    const sorted = sortProducts(catalogue, "name-asc");
    expect(sorted.map((p) => p.name)).toEqual(["Alpha", "Beta", "Mid", "Zephyr"]);
  });

  it("keeps equal prices in catalogue order, so a sort never shuffles on its own", () => {
    const sorted = sortProducts(
      [product("First", "9.50"), product("Second", "9.50")],
      "price-asc",
    );
    expect(sorted.map((p) => p.name)).toEqual(["First", "Second"]);
  });

  it("does not reorder the array it was given", () => {
    const original = catalogue.map((p) => p.name);
    sortProducts(catalogue, "price-asc");
    expect(catalogue.map((p) => p.name)).toEqual(original);
  });
});

describe("resultsLabel", () => {
  it("counts the rows on the page when the page is full", () => {
    expect(resultsLabel(pagination())).toBe("Showing 1–12 of 13 results");
  });

  it("counts the rows on the last, partial page", () => {
    expect(resultsLabel(pagination({ page: 2 }))).toBe("Showing 13–13 of 13 results");
  });

  it("says so in words when there is nothing to show", () => {
    // "Showing 0–0 of 0 results" is true and reads like a defect.
    expect(resultsLabel(pagination({ total: 0, totalPages: 0 }))).toBe("No results");
  });
});

describe("pageNumbers", () => {
  it("lists the pages the design shows for a two-page catalogue", () => {
    expect(pageNumbers(pagination())).toEqual([1, 2]);
  });

  it("shows a single page without a pager suffix", () => {
    expect(pageNumbers(pagination({ totalPages: 1 }))).toEqual([1]);
  });

  it("returns nothing when there are no pages", () => {
    expect(pageNumbers(pagination({ totalPages: 0 }))).toEqual([]);
  });

  it("shows first, last and the neighbours of the current page", () => {
    expect(pageNumbers(pagination({ page: 10, totalPages: 20 }))).toEqual([
      1,
      "gap",
      9,
      10,
      11,
      "gap",
      20,
    ]);
  });

  it("fills a single-number gap rather than spending a slot on an ellipsis", () => {
    // A naive window reads "1 … 3 4 5 … 7" here, spending two slots to hide two
    // numbers. Printing them costs the same and reads better.
    expect(pageNumbers(pagination({ page: 4, totalPages: 7 }))).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it("still elides when the gap hides more than one number", () => {
    expect(pageNumbers(pagination({ page: 3, totalPages: 7 }))).toEqual([
      1, 2, 3, 4, "gap", 7,
    ]);
  });

  it("stays on the first page without an empty window before it", () => {
    expect(pageNumbers(pagination({ page: 1, totalPages: 9 }))).toEqual([1, 2, "gap", 9]);
  });

  it("stays on the last page without an empty window after it", () => {
    expect(pageNumbers(pagination({ page: 9, totalPages: 9 }))).toEqual([1, "gap", 8, 9]);
  });
});

describe("shopHref", () => {
  it("omits the defaults so there is one canonical URL per view", () => {
    expect(shopHref({ page: 1, sort: "default" })).toBe("/shop");
  });

  it("keeps a non-default sort and drops the first page", () => {
    expect(shopHref({ page: 1, sort: "price-asc" })).toBe("/shop?sort=price-asc");
  });

  it("keeps the page and drops the default sort", () => {
    expect(shopHref({ page: 2, sort: "default" })).toBe("/shop?page=2");
  });

  it("carries both when both are set", () => {
    expect(shopHref({ page: 3, sort: "price-desc" })).toBe("/shop?sort=price-desc&page=3");
  });
});
