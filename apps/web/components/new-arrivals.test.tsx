import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ProductSummary } from "@my-ecommerce/shared";
import { HOME_GRID_SIZE, NewArrivals, NewArrivalsFallback } from "./new-arrivals";

/**
 * The home page's product grid, asserted through its markup.
 *
 * The products are a fixture: what the database hands over is
 * `lib/catalog/products-repo.test.ts`'s business. What is this component's is
 * the framing — the heading, its link, one card per product — and what it does
 * when there are none.
 */
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src?: unknown; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : "mock"} alt={alt ?? ""} />
  ),
}));

function product(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: "prod_1",
    slug: "earbud-wireless-bluetooth",
    name: "Earbud Wireless Bluetooth",
    price: { amount: "18.00", currency: "USD" },
    priceMax: null,
    compareAtPrice: null,
    image: null,
    inStock: true,
    categories: [{ id: "cat_earbuds", slug: "earbuds", name: "Earbuds" }],
    rating: null,
    ...overrides,
  };
}

const render = (products: ProductSummary[]) =>
  renderToStaticMarkup(<NewArrivals products={products} />);

describe("NewArrivals", () => {
  it("frames the grid with its heading and the way out of it", () => {
    const markup = render([product()]);

    expect(markup).toContain("New arrivals");
    expect(markup).toContain("View all products →");
    expect(markup).toContain('href="/shop"');
  });

  it("draws one card per product, each linking to its own page", () => {
    const markup = render([
      product(),
      product({ id: "prod_2", slug: "sport-in-ear-buds", name: "Sport In-Ear Buds" }),
    ]);

    expect(markup).toContain("Earbud Wireless Bluetooth");
    expect(markup).toContain("Sport In-Ear Buds");
    expect(markup).toContain('href="/products/earbuds/earbud-wireless-bluetooth"');
    expect(markup).toContain('href="/products/earbuds/sport-in-ear-buds"');
  });

  it("draws nothing at all when the shop has nothing to show", () => {
    // Not a heading over an empty grid: an empty "New arrivals" is a promise
    // the page cannot keep.
    expect(render([])).toBe("");
  });
});

describe("NewArrivalsFallback", () => {
  it("holds the grid's place, with nothing to announce", () => {
    const markup = renderToStaticMarkup(<NewArrivalsFallback />);

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("<h2");
    // The design's two rows of four.
    expect(markup.match(/aspect-\[4\/3\]/g)).toHaveLength(HOME_GRID_SIZE);
  });
});
