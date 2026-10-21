import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductSummarySchema } from "@my-ecommerce/shared";
import { getShopProducts, listNewArrivals } from "./products-repo";

/**
 * The storefront's catalogue read, against a stand-in for the database.
 *
 * The lane has "no external services" by design
 * (`.claude/tdd-guardian/config.json`), so Postgres is not available and no
 * product can actually be inserted. What is left worth testing is the mapping —
 * turning a row into a card — because that is where a mistake is silent: a
 * price taken from the wrong variant, or a summary the contract would reject,
 * is a shop that renders something untrue rather than an error anybody sees.
 */
const db = vi.hoisted(() => ({
  product: { findMany: vi.fn() },
  review: { groupBy: vi.fn() },
}));

vi.mock("@my-ecommerce/db", () => ({
  prisma: { product: db.product, review: db.review },
}));

type VariantRow = {
  priceAmount: string | null;
  priceCurrency: string | null;
  stock: number;
};

/** A variant that is priced and in stock, which is the ordinary case. */
function variant(overrides: Partial<VariantRow> = {}): VariantRow {
  return { priceAmount: "79.00", priceCurrency: "USD", stock: 12, ...overrides };
}

/** A row as the query returns one, with everything the summary reads. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "prod_1",
    status: "active",
    translations: [
      { locale: "en", name: "Studio Over-Ear", slug: "studio-over-ear" },
    ],
    variants: [variant()],
    media: [],
    categories: [],
    ...overrides,
  };
}

/** One image, positioned, as `media` holds it. */
function media(id: string, position = 0) {
  return { id, position };
}

/** A product's link to a category, as the join table returns one. */
function link(id: string, name: string, slug: string) {
  return { category: { id, translations: [{ name, slug }] } };
}

function manyRows(count: number) {
  return Array.from({ length: count }, (_, index) =>
    row({
      id: `prod_${index}`,
      translations: [
        { locale: "en", name: `Product ${index}`, slug: `product-${index}` },
      ],
      // Descending, so the ordering the assertion checks is not the order the
      // rows arrived in.
      variants: [variant({ priceAmount: String(100 - index) })],
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  db.product.findMany.mockResolvedValue([]);
  // Nothing reviewed yet, which is the state every case below that does not
  // say otherwise is about.
  db.review.groupBy.mockResolvedValue([]);
});

describe("getShopProducts", () => {
  it("asks only for products that are on sale, in the language and its fallback", async () => {
    // The status column is what the admin's Publish button writes, so a draft
    // reaching the shop would be the shop publishing something nobody did.
    // The locale is asked for as a list, because the row that comes back may
    // be either the page's language or the default behind it — the mapper
    // decides, and it can only decide about rows the query returned.
    db.product.findMany.mockResolvedValue([row()]);

    const { items } = await getShopProducts({ page: 1, sort: "default" }, "de");

    expect(db.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "active" },
        select: expect.objectContaining({
          translations: {
            where: { locale: { in: ["de", "en"] } },
            select: { name: true, slug: true, locale: true },
          },
        }),
      }),
    );
    expect(items).toHaveLength(1);
  });

  it("narrows to one category's products when it was asked about one", async () => {
    // A category page is the shop narrowed rather than a second listing, so the
    // narrowing is a term in this query. By id: the page has already looked the
    // category up — it knows its name and has to, to know the URL is one.
    db.product.findMany.mockResolvedValue([row()]);

    const { items } = await getShopProducts({
      page: 1,
      sort: "default",
      categoryId: "cat_earbuds",
    }, "en");

    expect(db.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "active",
          categories: { some: { categoryId: "cat_earbuds" } },
        },
      }),
    );
    expect(items).toHaveLength(1);
  });

  it("defines the catalogue's own order rather than trusting the database's", async () => {
    // "Default sorting" means the order the rows arrive in, and it is the
    // tie-break every price sort falls back on. Without an `ORDER BY` Postgres
    // promises nothing, so the default listing and every tie would shuffle
    // between requests.
    await getShopProducts({ page: 1, sort: "default" }, "en");

    expect(db.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
    );
  });

  it("does not read the image bytes", async () => {
    // `Media.data` is the file. An `include` here would drag every photograph
    // through the connection and drop it — measured at 19 MB for two products
    // — so a `select` that names its columns is load-bearing, and this is the
    // assertion that fails if someone switches it back.
    await getShopProducts({ page: 1, sort: "default" }, "en");

    const [query] = db.product.findMany.mock.calls[0] as [
      { select: { media: { select: Record<string, unknown> } } },
    ];

    expect(query.select.media.select).toEqual({ id: true, position: true });
    expect(query.select.media.select).not.toHaveProperty("data");
  });

  it("reads a product's photographs in the order the admin arranged them", async () => {
    // Ties are broken by id rather than left to the database: an arbitrary
    // winner would let a card's photograph change between two identical
    // requests.
    db.product.findMany.mockResolvedValue([
      row({ media: [media("media_b", 1), media("media_a", 1)] }),
    ]);

    const { items } = await getShopProducts({ page: 1, sort: "default" }, "en");

    expect(db.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          media: {
            orderBy: [{ position: "asc" }, { id: "asc" }],
            select: { id: true, position: true },
          },
        }),
      }),
    );
    // The database does the ordering; what the card gets is whatever came
    // first in the rows it was handed.
    expect(items[0]?.image?.id).toBe("media_b");
  });

  it("renders a product the database holds", async () => {
    db.product.findMany.mockResolvedValue([row()]);

    const { items } = await getShopProducts({ page: 1, sort: "default" }, "en");

    expect(items).toEqual([
      {
        id: "prod_1",
        slug: "studio-over-ear",
        name: "Studio Over-Ear",
        price: { amount: "79.00", currency: "USD" },
        priceMax: null,
        compareAtPrice: null,
        image: null,
        inStock: true,
        categories: [],
        rating: null,
      },
    ]);
  });

  it("carries the rating the review aggregate reports, and only that", async () => {
    db.product.findMany.mockResolvedValue([row(), row({ id: "prod_2" })]);
    db.review.groupBy.mockResolvedValue([
      { productId: "prod_1", _avg: { rating: 4.666666666666667 }, _count: { _all: 3 } },
    ]);

    const { items } = await getShopProducts({ page: 1, sort: "default" }, "en");

    expect(items[0]?.rating).toEqual({ average: 4.7, count: 3 });
    // The second product has no approved reviews, and "none" is not "zero" —
    // it renders no stars rather than one out of five.
    expect(items[1]?.rating).toBeNull();
    // Asked once, about every product the read returned.
    expect(db.review.groupBy).toHaveBeenCalledTimes(1);
    expect(db.review.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: { in: ["prod_1", "prod_2"] }, status: "approved" },
      }),
    );
  });

  it("hands out summaries the published contract accepts", async () => {
    // The fixture's own test made this claim, and it is the reason the fixture
    // could be swapped for this without the UI noticing: everything either of
    // them produces parses against the schema the API will send.
    db.product.findMany.mockResolvedValue([
      row(),
      row({ id: "prod_2", media: [media("media_1")] }),
      row({ id: "prod_3", categories: [link("cat_1", "Earbuds", "earbuds")] }),
    ]);

    for (const summary of (await getShopProducts({ page: 1, sort: "default" }, "en")).items) {
      const result = ProductSummarySchema.safeParse(summary);
      expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    }
  });
});

describe("the span a card shows", () => {
  it("shows one figure when every variant costs the same", async () => {
    db.product.findMany.mockResolvedValue([
      row({ variants: [variant({ priceAmount: "79.00" }), variant({ priceAmount: "79.00" })] }),
    ]);

    const [summary] = (await getShopProducts({ page: 1, sort: "default" }, "en")).items;

    expect(summary?.price).toEqual({ amount: "79.00", currency: "USD" });
    expect(summary?.priceMax).toBeNull();
  });

  it("treats one price written two ways as one price", async () => {
    // "79" and "79.00" are the same amount. Comparing the strings rather than
    // the values would put a "$79.00 – $79.00" range on the card.
    db.product.findMany.mockResolvedValue([
      row({ variants: [variant({ priceAmount: "79" }), variant({ priceAmount: "79.00" })] }),
    ]);

    const [summary] = (await getShopProducts({ page: 1, sort: "default" }, "en")).items;

    expect(summary?.priceMax).toBeNull();
  });

  it("spans the range when the variants differ", async () => {
    db.product.findMany.mockResolvedValue([
      row({ variants: [variant({ priceAmount: "18.00" }), variant({ priceAmount: "21.00" })] }),
    ]);

    const [summary] = (await getShopProducts({ page: 1, sort: "default" }, "en")).items;

    expect(summary?.price).toEqual({ amount: "18.00", currency: "USD" });
    expect(summary?.priceMax).toEqual({ amount: "21.00", currency: "USD" });
  });

  it("spans the range whatever order the variants arrive in", async () => {
    // The cheapest and dearest are found by comparing, not by assuming the
    // rows are sorted — the query does not promise an order.
    db.product.findMany.mockResolvedValue([
      row({ variants: [variant({ priceAmount: "21.00" }), variant({ priceAmount: "18.00" })] }),
    ]);

    const [summary] = (await getShopProducts({ page: 1, sort: "default" }, "en")).items;

    expect(summary?.price).toEqual({ amount: "18.00", currency: "USD" });
    expect(summary?.priceMax).toEqual({ amount: "21.00", currency: "USD" });
  });

  it("ignores a variant nobody has priced", async () => {
    // `price_amount` and `price_currency` are nullable so a draft can be saved
    // before anyone decides what it costs. An unpriced variant is not a
    // $0.00 one.
    db.product.findMany.mockResolvedValue([
      row({
        variants: [
          variant({ priceAmount: null, priceCurrency: null }),
          variant({ priceAmount: "34.00" }),
        ],
      }),
    ]);

    const [summary] = (await getShopProducts({ page: 1, sort: "default" }, "en")).items;

    expect(summary?.price).toEqual({ amount: "34.00", currency: "USD" });
    expect(summary?.priceMax).toBeNull();
  });

  it("ignores a variant priced in no currency", async () => {
    // Half a price is not a price: the amount means nothing without the unit
    // beside it.
    db.product.findMany.mockResolvedValue([
      row({
        variants: [
          variant({ priceAmount: "34.00", priceCurrency: null }),
          variant({ priceAmount: "35.00" }),
        ],
      }),
    ]);

    const [summary] = (await getShopProducts({ page: 1, sort: "default" }, "en")).items;

    expect(summary?.price).toEqual({ amount: "35.00", currency: "USD" });
  });

  it("leaves out a product no variant of which has a price", async () => {
    // There is no card to draw: `price` is required and not nullable, and
    // "$0.00" reads as free rather than as unknown.
    db.product.findMany.mockResolvedValue([
      row({ variants: [variant({ priceAmount: null, priceCurrency: null })] }),
    ]);

    const { items, pagination } = await getShopProducts({ page: 1, sort: "default" }, "en");

    expect(items).toEqual([]);
    expect(pagination.total).toBe(0);
  });

  it("leaves out a product with no variants at all", async () => {
    db.product.findMany.mockResolvedValue([row({ variants: [] })]);

    expect((await getShopProducts({ page: 1, sort: "default" }, "en")).items).toEqual([]);
  });

  it("leaves out a product priced in two currencies rather than throwing", async () => {
    // `compareMoney` refuses to order amounts in different currencies, by
    // design. Nothing writes a catalogue like this — the admin form stamps
    // every variant with one currency — and one contradictory row must not take
    // the whole shop page down with it.
    db.product.findMany.mockResolvedValue([
      row({ variants: [variant({ priceAmount: "79.00" }), variant({ priceCurrency: "EUR" })] }),
    ]);

    await expect(
      getShopProducts({ page: 1, sort: "default" }, "en"),
    ).resolves.toEqual(expect.objectContaining({ items: [] }));
  });
});

describe("what else the card reads", () => {
  it("counts a product as in stock when any variant is", async () => {
    db.product.findMany.mockResolvedValue([
      row({ variants: [variant({ stock: 0 }), variant({ stock: 3 })] }),
    ]);

    const [summary] = (await getShopProducts({ page: 1, sort: "default" }, "en")).items;

    expect(summary?.inStock).toBe(true);
  });

  it("counts a product with nothing on the shelf as out of stock", async () => {
    db.product.findMany.mockResolvedValue([row({ variants: [variant({ stock: 0 })] })]);

    const [summary] = (await getShopProducts({ page: 1, sort: "default" }, "en")).items;

    expect(summary?.inStock).toBe(false);
  });

  it("shows the first photograph, from where a shopper can fetch it", async () => {
    // Not the stored `url` column: that one is `/admin/media/{id}`, which
    // answers 404 to anyone without an admin session — every shopper.
    db.product.findMany.mockResolvedValue([
      row({ media: [media("media_first", 0), media("media_second", 1)] }),
    ]);

    const [summary] = (await getShopProducts({ page: 1, sort: "default" }, "en")).items;

    expect(summary?.image).toEqual({
      id: "media_first",
      url: "/media/media_first",
      alt: null,
      width: null,
      height: null,
      position: 0,
    });
  });

  it("leaves out a product with no translation in either language", async () => {
    // No name and no slug: there is no card, and no page for its link to lead
    // to. Not a state this app writes — every create writes one — but a hand
    // inserted row should not reach the screen half-formed.
    db.product.findMany.mockResolvedValue([row({ translations: [] })]);

    expect((await getShopProducts({ page: 1, sort: "default" }, "en")).items).toEqual([]);
  });

  it("keeps an untranslated product on the shelf, in the default language", async () => {
    // The state every product is in until somebody translates it: a German
    // shop with the English products in it rather than an empty grid. The row
    // is the one the query fetched as the fallback, and it is shown as it is.
    db.product.findMany.mockResolvedValue([row()]);

    const [summary] = (await getShopProducts({ page: 1, sort: "default" }, "de")).items;

    expect(summary?.name).toBe("Studio Over-Ear");
    expect(summary?.slug).toBe("studio-over-ear");
  });

  it("prefers the translation when the product has one, link and all", async () => {
    // The slug comes from the same row as the name, which is what makes a
    // translated product's links change with it — no card anywhere is edited
    // for the German address to appear.
    db.product.findMany.mockResolvedValue([
      row({
        translations: [
          { locale: "de", name: "Studio Überohr", slug: "studio-ueberohr" },
          { locale: "en", name: "Studio Over-Ear", slug: "studio-over-ear" },
        ],
      }),
    ]);

    const [summary] = (await getShopProducts({ page: 1, sort: "default" }, "de")).items;

    expect(summary?.name).toBe("Studio Überohr");
    expect(summary?.slug).toBe("studio-ueberohr");
  });
});

describe("the category a card names", () => {
  it("carries the category's name, slug and id", async () => {
    db.product.findMany.mockResolvedValue([
      row({ categories: [link("cat_1", "Earbuds", "earbuds")] }),
    ]);

    const [summary] = (await getShopProducts({ page: 1, sort: "default" }, "en")).items;

    expect(summary?.categories).toEqual([
      { id: "cat_1", name: "Earbuds", slug: "earbuds" },
    ]);
  });

  it("keeps the order the query put them in", async () => {
    // The card renders the first one, so "which category does this card name"
    // is decided by the ordering the query asked for, not by whatever the
    // database felt like returning.
    db.product.findMany.mockResolvedValue([
      row({
        categories: [
          link("cat_1", "Earbuds", "earbuds"),
          link("cat_2", "Headphones", "headphones"),
        ],
      }),
    ]);

    const [summary] = (await getShopProducts({ page: 1, sort: "default" }, "en")).items;

    expect(summary?.categories.map((category) => category.name)).toEqual([
      "Earbuds",
      "Headphones",
    ]);
  });

  it("orders a product's categories by the tree's own position", async () => {
    // Every category the admin's create screen makes is a root at position
    // zero, so position alone would leave the card's category line to the query
    // plan. The id breaks the tie.
    await getShopProducts({ page: 1, sort: "default" }, "en");

    expect(db.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          categories: expect.objectContaining({
            orderBy: [{ category: { position: "asc" } }, { categoryId: "asc" }],
          }),
        }),
      }),
    );
  });

  it("names no category for a product nobody has filed yet", async () => {
    // An ordinary state, not a failure — the card renders nothing for an empty
    // list, exactly as it does for one it cannot read.
    db.product.findMany.mockResolvedValue([row({ categories: [] })]);

    const [summary] = (await getShopProducts({ page: 1, sort: "default" }, "en")).items;

    expect(summary?.categories).toEqual([]);
  });

  it("skips a category with no name in either language", async () => {
    // A category whose translations have not been written is a gap in a card's
    // category line, not a reason to hide a product that is otherwise
    // sellable — and not a card rendering the word "undefined".
    db.product.findMany.mockResolvedValue([
      row({ categories: [{ category: { id: "cat_1", translations: [] } }] }),
    ]);

    const [summary] = (await getShopProducts({ page: 1, sort: "default" }, "en")).items;

    expect(summary?.categories).toEqual([]);
  });
});

describe("paging and ordering", () => {
  it("fills a page at twelve, as the design's grid does", async () => {
    db.product.findMany.mockResolvedValue(manyRows(13));

    const page = await getShopProducts({ page: 1, sort: "default" }, "en");

    expect(page.items).toHaveLength(12);
    expect(page.pagination).toEqual({
      page: 1,
      perPage: 12,
      total: 13,
      totalPages: 2,
    });
  });

  it("serves the remainder without repeating a product", async () => {
    db.product.findMany.mockResolvedValue(manyRows(13));

    const first = await getShopProducts({ page: 1, sort: "default" }, "en");
    const second = await getShopProducts({ page: 2, sort: "default" }, "en");

    expect(second.items).toHaveLength(1);

    const ids = [...first.items, ...second.items].map((product) => product.id);
    expect(new Set(ids).size).toBe(13);
  });

  it("orders the whole catalogue, not just the page it returns", async () => {
    // Sorting one page at a time would put the cheapest product of page two
    // above the dearest of page one. This is the assertion that catches it —
    // and the rows arrive in descending price, so a sort that did nothing would
    // fail it.
    db.product.findMany.mockResolvedValue(manyRows(13));

    const page = await getShopProducts({ page: 1, sort: "price-asc" }, "en");
    const amounts = page.items.map((product) => product.price.amount);

    expect(amounts).toEqual([...amounts].sort((a, b) => Number(a) - Number(b)));
    expect(amounts[0]).toBe("88");
  });

  it("clamps a page past the end rather than serving nothing", async () => {
    // `?page=99` is a stale link or a hand-edited URL, and the answer is the
    // last page rather than an empty grid. The clamping belongs to `paginate`,
    // which has its own tests — this is the wiring that proves it is used.
    db.product.findMany.mockResolvedValue(manyRows(2));

    const page = await getShopProducts({ page: 99, sort: "default" }, "en");

    expect(page.pagination.page).toBe(1);
    expect(page.items).toHaveLength(2);
  });
});

describe("listNewArrivals", () => {
  it("takes the newest products that are on sale, in SQL", async () => {
    // A window onto the catalogue rather than the catalogue itself: the home
    // grid draws eight cards, and the shop's pager is what exists for the rest.
    db.product.findMany.mockResolvedValue([row(), row({ id: "prod_2" })]);

    const products = await listNewArrivals(8, "en");

    expect(db.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "active" },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        take: 8,
      }),
    );
    expect(products.map((product) => product.id)).toEqual(["prod_1", "prod_2"]);
    // The same aggregate the shop's grid asks for, about the rows drawn.
    expect(db.review.groupBy).toHaveBeenCalledTimes(1);
  });

  it("drops a row the shop would not show", async () => {
    // Nothing priced: the shop's own rule, applied here for the same reason —
    // a card without a price is not a card.
    db.product.findMany.mockResolvedValue([
      row({ variants: [variant({ priceAmount: null, priceCurrency: null })] }),
      row({ id: "prod_2" }),
    ]);

    expect((await listNewArrivals(8, "en")).map((p) => p.id)).toEqual(["prod_2"]);
  });
});
