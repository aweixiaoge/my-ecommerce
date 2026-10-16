import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ProductSummary } from "@my-ecommerce/shared";
import { ShopProductCard } from "./shop-product-card";

const base: ProductSummary = {
  id: "prod_earbud-wireless-bluetooth",
  slug: "earbud-wireless-bluetooth",
  name: "Earbud Wireless Bluetooth",
  price: { amount: "18.00", currency: "USD" },
  priceMax: null,
  compareAtPrice: null,
  image: { id: "media_1", url: "/images/product-earbuds.jpg", alt: "Earbuds", width: 300, height: 300, position: 0 },
  inStock: true,
  categories: [{ id: "cat_earbuds", slug: "earbuds", name: "Earbuds" }],
  rating: { average: 4.4, count: 128 },
};

const render = (over: Partial<ProductSummary> = {}, eager = false) =>
  renderToStaticMarkup(
    <ShopProductCard product={{ ...base, ...over }} eager={eager} />,
  );

/**
 * The card's own image, told apart from the five star icons by the `fill`
 * layout Next marks it with. Matching on `<img` alone would catch those too.
 */
const productImage = (markup: string) => markup.match(/<img[^>]*data-nimg="fill"[^>]*>/)?.[0] ?? null;

describe("ShopProductCard", () => {
  it("shows a single figure when every variant costs the same", () => {
    const markup = render();

    expect(markup).toContain("$18.00");
    expect(markup).not.toContain("–");
  });

  it("shows the span when the variants differ in price", () => {
    const markup = render({ priceMax: { amount: "21.00", currency: "USD" } });

    expect(markup).toContain("$18.00");
    expect(markup).toContain("$21.00");
    expect(markup).toContain("–");
  });

  it("treats a priceMax equal to the price as a single figure", () => {
    // The contract allows priceMax to be set to the same amount; rendering
    // "$18.00 – $18.00" would be a defect the type system cannot catch.
    const markup = render({ priceMax: { amount: "18.00", currency: "USD" } });

    expect(markup).not.toContain("–");
  });

  it("names the product's first category, leaving the casing to CSS", () => {
    // The design sets it in caps with text-transform, so the DOM keeps the
    // real name — which is also what a screen reader should read.
    const markup = render();

    expect(markup).toContain("Earbuds");
    expect(markup).toContain("uppercase");
  });

  it("omits the category row rather than rendering an empty one", () => {
    const markup = render({ categories: [] });

    expect(markup).not.toContain("uppercase");
  });

  it("carries the star rating through", () => {
    expect(render()).toContain("Rated 4.4 out of 5 from 128 reviews");
  });

  it("renders no stars for a product with no reviews", () => {
    expect(render({ rating: null })).not.toContain("star-filled");
  });

  it("routes every pointer to the product page, under its category", () => {
    // There is no cart yet, so the button is a link. Three of them: the image,
    // the title and the button must all reach the same product — and that
    // address carries the category the card names, because a product's URL is
    // where it is filed (see `productPath`).
    const markup = render();

    expect(
      markup.match(/href="\/products\/earbuds\/earbud-wireless-bluetooth"/g),
    ).toHaveLength(3);
    expect(markup).toContain("Add to Cart");
  });

  it("links an unfiled product at the short address", () => {
    // A product nobody has categorised is still for sale, and its page is the
    // one-segment URL rather than a category it does not have.
    const markup = render({ categories: [] });

    expect(markup).toContain('href="/products/earbud-wireless-bluetooth"');
  });

  it("falls back to the product name when the image is missing", () => {
    const markup = render({ image: null });

    expect(productImage(markup)).toBeNull();
    expect(markup).toContain("Earbud Wireless Bluetooth");
  });

  it("marks the image eager for the first card and lazy for the rest", () => {
    // Above the fold on a phone, this image is the LCP element.
    expect(productImage(render({}, true))).not.toContain('loading="lazy"');
    expect(productImage(render())).toContain('loading="lazy"');
  });
});
