import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductSchema } from "@my-ecommerce/shared";
import {
  foreignProductPath,
  getProductBySlug,
  listRelatedProducts,
} from "./product-repo";

/**
 * The product page's read, against a stand-in for the database.
 *
 * The lane has no external services (`.claude/tdd-guardian/config.json`), so
 * what is worth testing is the mapping: what a row becomes on the page, and
 * which rows cannot become one at all.
 */
const db = vi.hoisted(() => ({
  product: { findFirst: vi.fn(), findMany: vi.fn() },
  review: { groupBy: vi.fn() },
}));

vi.mock("@my-ecommerce/db", () => ({
  prisma: { product: db.product, review: db.review },
}));

function variant(overrides: Record<string, unknown> = {}) {
  return {
    id: "var_onyx",
    sku: "23556-ew",
    priceAmount: "333.00",
    priceCurrency: "USD",
    stock: 12,
    optionValues: [
      {
        optionValue: {
          id: "val_onyx",
          translations: [{ locale: "en", name: "Onyx" }],
        },
      },
    ],
    media: [{ id: "media_onyx", position: 0 }],
    ...overrides,
  };
}

/** A row as `PRODUCT_DETAIL_SELECT` returns one. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "prod_1",
    translations: [
      {
        name: "Studio Over-Ear",
        slug: "studio-over-ear",
        description: "## Materials\n\nMemory foam.",
        shortDescription: "Closed-back.",
        metaTitle: "Studio Over-Ear",
        metaDescription: "Closed-back with a flat response.",
      },
    ],
    variants: [variant()],
    media: [{ id: "media_onyx", position: 0 }],
    categories: [
      {
        category: {
          id: "cat_1",
          translations: [{ name: "Earphone", slug: "earphone" }],
        },
      },
    ],
    options: [
      {
        id: "opt_color",
        position: 0,
        translations: [{ name: "Color" }],
        values: [
          { id: "val_onyx", translations: [{ name: "Onyx" }] },
          { id: "val_sand", translations: [{ name: "Sand" }] },
        ],
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.product.findFirst.mockResolvedValue(null);
  db.product.findMany.mockResolvedValue([]);
  // No approved reviews, which is the state most cases below are about.
  db.review.groupBy.mockResolvedValue([]);
});

describe("getProductBySlug", () => {
  it("looks the slug up through the translation, in either language, published only", async () => {
    // The slug lives in the translation table and is unique within a locale
    // rather than globally, so the lookup has to say which locales it means —
    // and both are answers, because a product nobody has translated is still a
    // product the shop is selling.
    db.product.findFirst.mockResolvedValue(row());

    await getProductBySlug("studio-over-ear", "de");

    expect(db.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "active",
          translations: {
            some: {
              slug: "studio-over-ear",
              locale: { in: ["de", "en"] },
            },
          },
        },
      }),
    );
  });

  it("answers null for a slug that names nothing", async () => {
    expect(await getProductBySlug("nope", "en")).toBeNull();
  });

  it("hands out a product the published contract accepts", async () => {
    db.product.findFirst.mockResolvedValue(row());

    const detail = await getProductBySlug("studio-over-ear", "en");

    const result = ProductSchema.safeParse(detail?.product);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });

  it("carries the rating the buy box and the tab label read", async () => {
    db.product.findFirst.mockResolvedValue(row());
    db.review.groupBy.mockResolvedValue([
      { productId: "prod_1", _avg: { rating: 4.5 }, _count: { _all: 2 } },
    ]);

    const detail = await getProductBySlug("studio-over-ear", "en");

    expect(detail?.product.rating).toEqual({ average: 4.5, count: 2 });
    expect(db.review.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: { in: ["prod_1"] }, status: "approved" },
      }),
    );
  });

  it("shows no rating at all until a review is approved", async () => {
    db.product.findFirst.mockResolvedValue(row());

    const detail = await getProductBySlug("studio-over-ear", "en");

    // Null rather than an average of zero: the buy box renders no stars and
    // "(0 customer reviews)", not one out of five.
    expect(detail?.product.rating).toBeNull();
  });
});

describe("foreignProductPath", () => {
  /** A row whose translations are the page's own — what the select returns
   *  after it has filtered to the fallback set. */
  function frenchRow() {
    return row({
      translations: [
        {
          locale: "fr",
          slug: "casque-circum-aural-de-studio",
          name: "Casque circum-aural de studio",
        },
      ],
      categories: [
        {
          category: {
            id: "cat_1",
            translations: [
              { locale: "fr", name: "Écouteurs", slug: "ecouteurs" },
            ],
          },
        },
      ],
    });
  }

  it("finds a product by a slug from another language, and answers with this language's address", async () => {
    // The language switcher's case: `/fr` arrived from `/de/products/kopfhorer/
    // kopfhorer`, and the German slug is what it is holding. The product is
    // found — by a slug no French row carries — and the answer is the French
    // address, which the page then redirects to.
    db.product.findFirst.mockResolvedValue(frenchRow());

    expect(await foreignProductPath("kopfhorer", "fr")).toBe(
      "/fr/products/ecouteurs/casque-circum-aural-de-studio",
    );

    // Any language's slug, and only published products: the fallback set has
    // already been asked and said no, so this one does not narrow by locale.
    expect(db.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "active", translations: { some: { slug: "kopfhorer" } } },
      }),
    );
  });

  it("answers null for a slug no language knows", async () => {
    expect(await foreignProductPath("nope", "fr")).toBeNull();
  });

  it("answers null for a product no page would render", async () => {
    // Nothing priced, so there is no page at the English address either — and
    // an address that does not exist is not one to be sent to.
    db.product.findFirst.mockResolvedValue(row({ variants: [] }));

    expect(await foreignProductPath("kopfhorer", "fr")).toBeNull();
  });

  it("answers null for a row with no translation in this page's languages", async () => {
    // Reachable for the reason the lookup above gives: `some` chooses which
    // rows come back, not which translations, so a product whose German row is
    // its only one arrives with nothing to build an address from.
    db.product.findFirst.mockResolvedValue(row({ translations: [] }));

    expect(await foreignProductPath("kopfhorer", "fr")).toBeNull();
  });
});

describe("the product a page renders", () => {
  it("carries the copy, the options and the images", async () => {
    db.product.findFirst.mockResolvedValue(row());

    const detail = await getProductBySlug("studio-over-ear", "en");

    expect(detail?.product).toEqual(
      expect.objectContaining({
        id: "prod_1",
        slug: "studio-over-ear",
        name: "Studio Over-Ear",
        description: "## Materials\n\nMemory foam.",
        shortDescription: "Closed-back.",
        metaTitle: "Studio Over-Ear",
        metaDescription: "Closed-back with a flat response.",
        options: [
          {
            id: "opt_color",
            name: "Color",
            position: 0,
            values: [
              { id: "val_onyx", name: "Onyx" },
              { id: "val_sand", name: "Sand" },
            ],
          },
        ],
      }),
    );
  });

  it("carries the price its card shows, from the one mapping that decides it", async () => {
    // The summary half comes from `toSummary`, so the page a card links to
    // cannot quote a different price from the card that linked there.
    db.product.findFirst.mockResolvedValue(row());

    const detail = await getProductBySlug("studio-over-ear", "en");

    expect(detail?.product.price).toEqual({ amount: "333.00", currency: "USD" });
    expect(detail?.product.categories).toEqual([
      { id: "cat_1", name: "Earphone", slug: "earphone" },
    ]);
  });

  it("shows a blank blurb as none at all", async () => {
    db.product.findFirst.mockResolvedValue(
      row({
        translations: [
          {
            name: "Untitled",
            slug: "untitled",
            description: "",
            shortDescription: "",
            metaTitle: null,
            metaDescription: null,
          },
        ],
      }),
    );

    const detail = await getProductBySlug("untitled", "en");

    expect(detail?.product.shortDescription).toBeNull();
    expect(detail?.product.metaTitle).toBeNull();
  });

  it("keys the variant images so the gallery can follow the selection", async () => {
    db.product.findFirst.mockResolvedValue(row());

    const detail = await getProductBySlug("studio-over-ear", "en");

    expect(detail?.imagesByVariant).toEqual({
      var_onyx: [
        {
          id: "media_onyx",
          url: "/media/media_onyx",
          alt: null,
          width: null,
          height: null,
          position: 0,
        },
      ],
    });
  });

  it("answers null for a row with no translation in this locale", async () => {
    // Reachable despite the query's `some` filter, which narrows which
    // *products* come back rather than which translations.
    db.product.findFirst.mockResolvedValue(row({ translations: [] }));

    expect(await getProductBySlug("studio-over-ear", "en")).toBeNull();
  });

  it("answers null when nothing on the product is priced", async () => {
    // The same rule the listing applies. A product the grid hides should not
    // still answer on its own URL.
    db.product.findFirst.mockResolvedValue(
      row({ variants: [variant({ priceAmount: null, priceCurrency: null })] }),
    );

    expect(await getProductBySlug("studio-over-ear", "en")).toBeNull();
  });
});

describe("the variants a shopper can pick between", () => {
  it("keeps a variant that is priced and identified", async () => {
    db.product.findFirst.mockResolvedValue(row());

    const detail = await getProductBySlug("studio-over-ear", "en");

    expect(detail?.product.variants).toEqual([
      {
        id: "var_onyx",
        sku: "23556-ew",
        price: { amount: "333.00", currency: "USD" },
        compareAtPrice: null,
        stock: 12,
        inStock: true,
        optionValues: [{ id: "val_onyx", name: "Onyx" }],
      },
    ]);
  });

  it("leaves out a variant with no SKU", async () => {
    // `VariantSchema` requires one while the column is nullable — a draft
    // colour has no SKU until somebody decides it. Dropped rather than
    // invented, which is why the picker treats "no variant behind this value"
    // as an ordinary answer.
    db.product.findFirst.mockResolvedValue(row({ variants: [variant({ sku: null })] }));

    const detail = await getProductBySlug("studio-over-ear", "en");

    expect(detail?.product.variants).toEqual([]);
  });

  it("leaves out a variant with no price", async () => {
    db.product.findFirst.mockResolvedValue(
      row({
        variants: [
          variant({ id: "var_a", priceAmount: null, priceCurrency: null }),
          variant({ id: "var_b", sku: "B" }),
        ],
      }),
    );

    const detail = await getProductBySlug("studio-over-ear", "en");

    expect(detail?.product.variants?.map((v) => v.id)).toEqual(["var_b"]);
  });

  it("calls a variant with nothing on the shelf out of stock", async () => {
    db.product.findFirst.mockResolvedValue(row({ variants: [variant({ stock: 0 })] }));

    const detail = await getProductBySlug("studio-over-ear", "en");

    expect(detail?.product.variants?.[0]?.inStock).toBe(false);
  });

  it("survives a variant's value with no name in this locale", async () => {
    // The same guard one level down: the picker matches variants by value id,
    // so an unnamed value still selects correctly and simply has nothing to
    // print.
    db.product.findFirst.mockResolvedValue(
      row({
        variants: [
          variant({
            optionValues: [{ optionValue: { id: "val_onyx", translations: [] } }],
          }),
        ],
      }),
    );

    const detail = await getProductBySlug("studio-over-ear", "en");

    expect(detail?.product.variants?.[0]?.optionValues).toEqual([
      { id: "val_onyx", name: "" },
    ]);
  });

  it("survives an option or a value with no name in this locale", async () => {
    // Not a state this app writes — the form always names them — so this is
    // for a hand-inserted row, and an unnamed pill beats a crash.
    db.product.findFirst.mockResolvedValue(
      row({
        options: [
          {
            id: "opt_color",
            position: 0,
            translations: [],
            values: [{ id: "val_onyx", translations: [] }],
          },
        ],
      }),
    );

    const detail = await getProductBySlug("studio-over-ear", "en");

    expect(detail?.product.options).toEqual([
      {
        id: "opt_color",
        name: "",
        position: 0,
        values: [{ id: "val_onyx", name: "" }],
      },
    ]);
  });
});

describe("listRelatedProducts", () => {
  it("finds other products in the same categories", async () => {
    await listRelatedProducts({
      productId: "prod_1",
      categoryIds: ["cat_1"],
      limit: 4,
    }, "en");

    expect(db.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "active",
          id: { not: "prod_1" },
          categories: { some: { categoryId: { in: ["cat_1"] } } },
        },
        take: 4,
      }),
    );
  });

  it("asks for nothing when the product is in no category", async () => {
    // "What is like this product" has no answer when nobody has said what it
    // is, so it returns an empty row rather than querying for everything.
    expect(
      await listRelatedProducts({ productId: "prod_1", categoryIds: [], limit: 4 }, "en"),
    ).toEqual([]);

    expect(db.product.findMany).not.toHaveBeenCalled();
  });

  it("reduces each row the way the shop grid does", async () => {
    db.product.findMany.mockResolvedValue([row({ id: "prod_2" })]);

    const related = await listRelatedProducts({
      productId: "prod_1",
      categoryIds: ["cat_1"],
      limit: 4,
    }, "en");

    expect(related.map((product) => product.id)).toEqual(["prod_2"]);
    expect(related[0]?.price).toEqual({ amount: "333.00", currency: "USD" });
  });

  it("gives each related product its own rating", async () => {
    // One aggregate for the row, keyed by product — not the first product's
    // figure repeated down the row, which is what a single-value lookup would
    // produce.
    db.product.findMany.mockResolvedValue([
      row({ id: "prod_2" }),
      row({ id: "prod_3" }),
    ]);
    db.review.groupBy.mockResolvedValue([
      { productId: "prod_3", _avg: { rating: 3.4 }, _count: { _all: 5 } },
    ]);

    const related = await listRelatedProducts({
      productId: "prod_1",
      categoryIds: ["cat_1"],
      limit: 4,
    }, "en");

    expect(related[0]?.rating).toBeNull();
    expect(related[1]?.rating).toEqual({ average: 3.4, count: 5 });
  });

  it("drops a row the grid would drop too", async () => {
    // The same rule as the listing: a product with no price has no honest card,
    // so it does not appear in the related row either.
    db.product.findMany.mockResolvedValue([
      row({ id: "prod_2", variants: [variant({ priceAmount: null, priceCurrency: null })] }),
    ]);

    expect(
      await listRelatedProducts({ productId: "prod_1", categoryIds: ["cat_1"], limit: 4 }, "en"),
    ).toEqual([]);
  });
});
