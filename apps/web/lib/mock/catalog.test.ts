import { describe, expect, it } from "vitest";
import { ProductSchema, ProductSummarySchema, compareMoney } from "@my-ecommerce/shared";
import {
  getCategories,
  getNewArrivals,
  getProductBySlug,
  getProductSlugs,
  getProducts,
  getShopProducts,
} from "./catalog";

/**
 * The mock's whole job is to be indistinguishable from the API it stands in
 * for. These assertions are that claim, checked: everything it hands out parses
 * against the published schema, so the fixture cannot quietly drift from the
 * contract and leave the UI built against data the API will never send.
 */

describe("the mock catalogue", () => {
  it("hands out products that parse against the public contract", async () => {
    const products = await getProductBySlug("earbud-wireless-bluetooth");
    expect(ProductSchema.safeParse(products).success).toBe(true);
  });

  it("hands out valid summaries for every product in the listing", async () => {
    for (const summary of await getProducts()) {
      const result = ProductSummarySchema.safeParse(summary);
      expect(result.success, `${summary.slug}: ${JSON.stringify(result.error?.issues)}`).toBe(
        true,
      );
    }
  });

  it("has enough products to fill more than one page", async () => {
    // The design's pager only renders when there IS a second page, so a
    // fixture that fits on one page cannot exercise it.
    const listings = await getShopProducts({ page: 1, sort: "default" });
    expect(listings.pagination.total).toBeGreaterThan(listings.pagination.perPage);
  });

  it("uses a slug uniquely, since slugs are the public URL", async () => {
    const slugs = await getProductSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("summarises each product as the span of its own variants", async () => {
    // A card renders this range, so price must be the cheapest variant and
    // priceMax the dearest — or null when there is only one price to show.
    for (const summary of await getProducts()) {
      const variants = (await getProductBySlug(summary.slug))!.variants;
      const prices = variants.map((v) => v.price).sort(compareMoney);
      const cheapest = prices[0];
      const dearest = prices[prices.length - 1];

      expect(summary.price).toEqual(cheapest);
      expect(summary.priceMax).toEqual(compareMoney(cheapest, dearest) === 0 ? null : dearest);
    }
  });

  it("returns null for a slug that is not in the catalogue", async () => {
    expect(await getProductBySlug("no-such-product")).toBeNull();
  });

  it("offers the three categories the header and cards name", async () => {
    const categories = await getCategories();
    expect(categories.map((c) => c.slug)).toEqual(["earbuds", "headphones", "accessories"]);
  });
});

describe("getShopProducts", () => {
  it("serves the first page at twelve products, as the design's grid does", async () => {
    const page = await getShopProducts({ page: 1, sort: "default" });

    expect(page.items).toHaveLength(12);
    expect(page.pagination).toEqual({ page: 1, perPage: 12, total: 13, totalPages: 2 });
  });

  it("serves the remainder on the last page without repeating a product", async () => {
    const first = await getShopProducts({ page: 1, sort: "default" });
    const second = await getShopProducts({ page: 2, sort: "default" });

    expect(second.items).toHaveLength(1);

    const ids = [...first.items, ...second.items].map((p) => p.id);
    expect(new Set(ids).size).toBe(13);
  });

  it("orders the whole catalogue, not just the page it returns", async () => {
    // Sorting a page at a time would put the cheapest product of page two
    // above the dearest of page one. This is the assertion that catches it.
    const page = await getShopProducts({ page: 1, sort: "price-asc" });
    const amounts = page.items.map((p) => Number(p.price.amount));

    expect(amounts).toEqual([...amounts].sort((a, b) => a - b));
    expect(amounts[0]).toBe(9);
  });

  it("puts the dearest product first when descending", async () => {
    const page = await getShopProducts({ page: 1, sort: "price-desc" });

    expect(page.items[0].slug).toBe("noise-cancelling-headphones");
  });

  it("carries the products the page-one sort pushed past twelve", async () => {
    // The 13th product by price ascending, and the only one on page two.
    const page = await getShopProducts({ page: 2, sort: "price-asc" });

    expect(page.items.map((p) => p.slug)).toEqual(["noise-cancelling-headphones"]);
  });
});

describe("getNewArrivals", () => {
  it("caps the home grid at the number the design shows", async () => {
    expect(await getNewArrivals(8)).toHaveLength(8);
  });

  it("returns fewer than asked for when the catalogue is shorter", async () => {
    expect(await getNewArrivals(50)).toHaveLength(13);
  });
});
