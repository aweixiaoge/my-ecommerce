import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Pagination } from "@my-ecommerce/shared";
import { ShopPagination } from "./shop-pagination";

const page = (over: Partial<Pagination> = {}): Pagination => ({
  page: 1,
  perPage: 12,
  total: 13,
  totalPages: 2,
  ...over,
});

const render = (
  pagination: Pagination,
  sort: "default" | "price-asc" = "default",
  path = "/shop",
) =>
  renderToStaticMarkup(
    <ShopPagination pagination={pagination} sort={sort} path={path} />,
  );

/** Hrefs as the browser would resolve them, with the `&` entities decoded. */
const hrefs = (markup: string) =>
  [...markup.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replaceAll("&amp;", "&"));

describe("ShopPagination", () => {
  it("marks the current page rather than linking back to it", () => {
    const markup = render(page());

    expect(markup).toContain('aria-current="page"');
    expect(hrefs(markup)).not.toContain("/shop");
    expect(hrefs(markup)).toContain("/shop?page=2");
  });

  it("moves the current marker when the page does", () => {
    const markup = render(page({ page: 2 }));

    // Page 1 is now the only link, and its href is the canonical bare one.
    expect(hrefs(markup)).toEqual(["/shop"]);
  });

  it("keeps the active sort on every link", () => {
    // Paging is a move within a sorted list, not a way to lose the sort. Both
    // the page pill and Next must carry it.
    const links = hrefs(render(page(), "price-asc"));

    expect(links).toEqual(["/shop?sort=price-asc&page=2", "/shop?sort=price-asc&page=2"]);
  });

  it("keeps a category's pages on the category", () => {
    // The pager is the shop's component rendered on a category page too, and a
    // href that dropped back to `/shop` would send a shopper somewhere they
    // were not: the reason `path` is a required prop.
    expect(hrefs(render(page(), "default", "/products/earbuds"))).toEqual([
      "/products/earbuds?page=2",
      "/products/earbuds?page=2",
    ]);
  });

  it("omits Next on the last page, where there is nowhere to go", () => {
    expect(render(page({ page: 2 }))).not.toContain("Next");
    expect(render(page())).toContain("Next");
  });

  it("renders nothing for a catalogue that fits on one page", () => {
    // The design only draws a pager because its catalogue has two pages.
    expect(render(page({ total: 5, totalPages: 1 }))).toBe("");
    expect(render(page({ total: 0, totalPages: 0 }))).toBe("");
  });

  it("labels the nav so it is not just a row of anonymous links", () => {
    expect(render(page())).toContain('aria-label="Pagination"');
  });

  it("elides a long run of pages around the current one", () => {
    const markup = render(page({ page: 10, total: 300, totalPages: 25 }));

    expect(hrefs(markup)).toContain("/shop?page=9");
    expect(hrefs(markup)).toContain("/shop?page=11");
    expect(hrefs(markup)).toContain("/shop?page=25");
    expect(markup).toContain("…");
  });
});
