import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHeroProduct } from "./featured-repo";

/**
 * The home page's one featured read, against a stand-in for the database.
 *
 * The lane has no external services (`.claude/tdd-guardian/config.json`), so
 * what is worth asserting is the query — featured, published, newest first —
 * and the rule this repository exists for: the hero may only show a product the
 * shop itself would show.
 */
const db = vi.hoisted(() => ({
  product: { findMany: vi.fn() },
  review: { groupBy: vi.fn() },
}));

vi.mock("@my-ecommerce/db", () => ({
  prisma: { product: db.product, review: db.review },
}));

/** A row as `featuredSelect` returns one: a product the shop can sell. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "prod_1",
    translations: [
      {
        name: "Earbud Wireless",
        slug: "earbud-wireless",
        shortDescription: "Forty hours of battery.",
      },
    ],
    variants: [{ priceAmount: "79.00", priceCurrency: "USD", stock: 4 }],
    media: [{ id: "media_1", position: 0 }],
    categories: [
      {
        category: {
          id: "cat_1",
          translations: [{ name: "Earbuds", slug: "earbuds" }],
        },
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.product.findMany.mockResolvedValue([]);
  db.review.groupBy.mockResolvedValue([]);
});

describe("getHeroProduct", () => {
  it("asks for published products that are featured, newest first", async () => {
    await getHeroProduct("en");

    expect(db.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // A draft is not for sale, so it is not on the home page; the absence
        // of a featured row is what "not featured" is.
        where: { status: "active", featuredProduct: { isNot: null } },
        // The last thing featured is what the home page shows, and the id
        // breaks a same-millisecond tie rather than the query plan.
        orderBy: [{ featuredProduct: { createdAt: "desc" } }, { id: "asc" }],
      }),
    );
  });

  it("draws the newest featured product", async () => {
    db.product.findMany.mockResolvedValue([row()]);

    const hero = await getHeroProduct("en");

    expect(hero).toEqual({
      id: "prod_1",
      name: "Earbud Wireless",
      shortDescription: "Forty hours of battery.",
      image: {
        id: "media_1",
        url: "/media/media_1",
        alt: null,
        width: null,
        height: null,
        position: 0,
        kind: "image",
      },
      href: "/en/products/earbuds/earbud-wireless",
    });
  });

  it("skips a featured product the shop cannot sell", async () => {
    // Featured, published, and with no price on any variant: the shop's own
    // rule drops it from every card, and the hero must not link to a page that
    // 404s. The next one down the list is the hero instead.
    db.product.findMany.mockResolvedValue([
      row({ id: "prod_free", variants: [] }),
      row({
        id: "prod_2",
        translations: [
          { name: "Studio Over-Ear", slug: "studio-over-ear", shortDescription: "" },
        ],
      }),
    ]);

    const hero = await getHeroProduct("en");

    expect(hero?.id).toBe("prod_2");
    // The blurb is empty on that one, which the hero draws as no paragraph.
    expect(hero?.shortDescription).toBeNull();
  });

  it("skips a featured product with no name in this locale", async () => {
    db.product.findMany.mockResolvedValue([
      row({ translations: [] }),
      row({ id: "prod_2" }),
    ]);

    expect((await getHeroProduct("en"))?.id).toBe("prod_2");
  });

  it("answers null when nothing featured is showable", async () => {
    // The home page then keeps the hero it has always had rather than
    // inventing a product nobody chose.
    expect(await getHeroProduct("en")).toBeNull();

    db.product.findMany.mockResolvedValue([row({ variants: [] })]);

    expect(await getHeroProduct("en")).toBeNull();
  });

  it("rates the products it asked about, in one query", async () => {
    // The hero draws no stars today; the summary it is built from carries a
    // rating all the same, and asking for it here is what keeps that rating
    // from being a `null` that means "not asked for".
    db.product.findMany.mockResolvedValue([row(), row({ id: "prod_2" })]);
    db.review.groupBy.mockResolvedValue([
      { productId: "prod_1", _avg: { rating: 4.5 }, _count: { _all: 2 } },
    ]);

    const hero = await getHeroProduct("en");

    expect(db.review.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: { in: ["prod_1", "prod_2"] }, status: "approved" },
      }),
    );
    expect(hero?.id).toBe("prod_1");
  });
});
