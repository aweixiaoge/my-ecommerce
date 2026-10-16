import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Hero, HeroFallback } from "./hero";
import type { HeroProduct } from "@/lib/catalog/featured-rows";

/**
 * The home page's opening block, in its two contents.
 *
 * Rendered markup rather than a DOM, because nothing here reacts to anything:
 * the question is which of the two heroes a given product produces, and every
 * answer to that is in the HTML. The product itself is a fixture — what the
 * database hands over is `featured-repo`'s test.
 *
 * The database module is mocked although the hero asks it nothing: the
 * component imports the `HeroProduct` type from the catalog folder, and one
 * value import in that graph builds a Prisma client on the way through.
 */
vi.mock("@my-ecommerce/db", () => ({ prisma: {} }));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src?: unknown; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : "mock"} alt={alt ?? ""} />
  ),
}));

const product = (overrides: Partial<HeroProduct> = {}): HeroProduct => ({
  id: "prod_1",
  name: "Earbud Wireless",
  shortDescription: "Forty hours of battery, in a case the size of a coin.",
  image: {
    id: "media_1",
    url: "/media/media_1",
    alt: null,
    width: null,
    height: null,
    position: 0,
  },
  href: "/products/earbuds/earbud-wireless",
  ...overrides,
});

const render = (featured: HeroProduct | null) =>
  renderToStaticMarkup(<Hero product={featured} />);

describe("the hero with a featured product", () => {
  it("draws that product's name, blurb and picture", () => {
    const markup = render(product());

    expect(markup).toContain("<h1");
    expect(markup).toContain("Earbud Wireless");
    expect(markup).toContain("Forty hours of battery, in a case the size of a coin.");
    expect(markup).toContain('src="/media/media_1"');
    // The picture describes the product when it carries no alt text of its own.
    expect(markup).toContain('alt="Earbud Wireless"');
  });

  it("sends the button to the product's own page", () => {
    const markup = render(product());

    expect(markup).toContain("Shop it now");
    expect(markup).toContain('href="/products/earbuds/earbud-wireless"');
    // The old label and its address are gone: this hero is about one product.
    expect(markup).not.toContain("Shop all products");
  });

  it("keeps the shop's own lines, which are not a product's to replace", () => {
    const markup = render(product());

    expect(markup).toContain("Hand-tested audio gear");
    expect(markup).toContain("Read our story");
    expect(markup).not.toContain("Sound that keeps up with your day.");
  });

  it("draws no paragraph for a product nobody has described", () => {
    const markup = render(product({ shortDescription: null }));

    expect(markup).toContain("Earbud Wireless");
    // Neither its own blurb — there is none — nor the shop's copy, which would
    // be a sentence about the range on a page about one product.
    expect(markup).not.toContain("Wireless earbuds, earphones and headphones");
  });

  it("leaves the picture slot empty for a product with no photograph", () => {
    const markup = render(product({ image: null }));

    expect(markup).not.toContain("<img");
    // The hero photograph is not a stand-in for a missing product picture.
    expect(markup).not.toContain("hero-audio.jpg");
  });
});

describe("the hero with nothing featured", () => {
  it("draws the copy the page has always had", () => {
    const markup = render(null);

    expect(markup).toContain("Sound that keeps up with your day.");
    expect(markup).toContain("Wireless earbuds, earphones and headphones");
    expect(markup).toContain('src="/images/hero-audio.jpg"');
  });

  it("sends the button to the shop", () => {
    const markup = render(null);

    expect(markup).toContain("Shop all products");
    expect(markup).toContain('href="/shop"');
    expect(markup).not.toContain("Shop it now");
  });
});

describe("HeroFallback", () => {
  it("stands in silently, with nothing for a screen reader to announce", () => {
    const markup = renderToStaticMarkup(<HeroFallback />);

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("<h1");
    expect(markup).not.toContain("<img");
  });
});
