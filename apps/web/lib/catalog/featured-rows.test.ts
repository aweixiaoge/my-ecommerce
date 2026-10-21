import { describe, expect, it, vi } from "vitest";
import type { ProductSummary } from "@my-ecommerce/shared";
import { toHeroProduct, type FeaturedRow } from "./featured-rows";

/**
 * What the hero's product is made of, with no database anywhere near it.
 *
 * The mapping is four fields wide, and two of them are decisions rather than
 * copies: the blurb's empty string, and the address, which is `productPath`'s
 * to make. Both are asserted here rather than through the repository that calls
 * this.
 */
/*
 * The mapper itself asks the database nothing, but it borrows the shop's
 * select from `product-summary` — a value import, so the module graph reaches
 * `media-repo`, which builds a client on import. Nothing here calls it.
 */
vi.mock("@my-ecommerce/db", () => ({ prisma: {} }));

/** A row as `FEATURED_SELECT` returns one. */
function row(overrides: Partial<FeaturedRow> = {}): FeaturedRow {
  return {
    id: "prod_1",
    translations: [
      {
        name: "Earbud Wireless",
        slug: "earbud-wireless",
        shortDescription: "Forty hours of battery, in a case the size of a coin.",
      },
    ],
    variants: [],
    media: [],
    categories: [],
    ...overrides,
  } as FeaturedRow;
}

/** The summary the repository hands over once the row has survived `toSummary`. */
function summary(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: "prod_1",
    slug: "earbud-wireless",
    name: "Earbud Wireless",
    price: { amount: "79.00", currency: "USD" },
    priceMax: null,
    compareAtPrice: null,
    image: null,
    inStock: true,
    categories: [{ id: "cat_1", slug: "earbuds", name: "Earbuds" }],
    rating: null,
    ...overrides,
  };
}

describe("toHeroProduct", () => {
  it("draws the name, the blurb, the picture and the address", () => {
    const image = {
      id: "media_1",
      url: "/media/media_1",
      alt: null,
      width: null,
      height: null,
      position: 0,
    };

    expect(toHeroProduct(row(), summary({ image }), "en")).toEqual({
      id: "prod_1",
      name: "Earbud Wireless",
      shortDescription: "Forty hours of battery, in a case the size of a coin.",
      image,
      href: "/en/products/earbuds/earbud-wireless",
    });
  });

  it("takes the address from the product's category, not from this file", () => {
    // `productPath` owns that rule — the hero's button and the card's link are
    // the same address because they are the same function.
    const hero = toHeroProduct(
      row(),
      summary({
        slug: "studio-over-ear",
        categories: [{ id: "cat_2", slug: "earphone", name: "Earphone" }],
      }),
      "en",
    );

    expect(hero.href).toBe("/en/products/earphone/studio-over-ear");
  });

  it("leaves an unfiled product at the short address", () => {
    expect(toHeroProduct(row(), summary({ categories: [] }), "en").href).toBe(
      "/en/products/earbud-wireless",
    );
  });

  it("has no blurb when there is none written", () => {
    // Null rather than an empty paragraph: the hero draws nothing where the
    // sentence would be, and `||` is what makes "" mean the same thing.
    for (const shortDescription of [undefined, ""]) {
      const hero = toHeroProduct(
        row({
          translations: [
            {
              locale: "en",
              name: "Earbud Wireless",
              slug: "earbud-wireless",
              shortDescription,
            },
          ],
        } as FeaturedRow),
        summary(),
        "en",
      );

      expect(hero.shortDescription).toBeNull();
    }
  });

  it("has no blurb when the row's translation is missing", () => {
    // Unreachable through the repository — `toSummary` refuses a row with no
    // translation in this locale, so no such row reaches this mapper — and
    // kept because reading `.at(0)` off an empty array has to answer
    // something.
    expect(
      toHeroProduct(row({ translations: [] }), summary(), "en").shortDescription,
    ).toBeNull();
  });
});
