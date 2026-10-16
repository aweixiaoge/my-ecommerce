import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminProductCreate } from "@my-ecommerce/shared";
import {
  createProduct,
  DuplicateSkuError,
  getProductForEdit,
  listProducts,
  setProductStatus,
  UnknownCategoryError,
  updateProduct,
} from "./products-repo";
import { SlugExhaustedError } from "./slug";

/**
 * The repository, against a stand-in for the database.
 *
 * The lane these run in has "no external services" by design
 * (`.claude/tdd-guardian/config.json`), so Postgres is not available and a real
 * product cannot be inserted. What is left worth testing is everything above
 * the driver: the retry a unique constraint forces, and telling two constraints
 * apart — logic that is wrong in ways nothing else would catch, because a
 * mis-classified violation is either an infinite retry or a sentence about the
 * wrong field.
 */
const db = vi.hoisted(() => ({
  product: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  productTranslation: { upsert: vi.fn() },
  productOption: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
  productOptionValue: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  productVariant: {
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    deleteMany: vi.fn(),
  },
  media: { updateMany: vi.fn(), deleteMany: vi.fn() },
  productCategory: { create: vi.fn(), deleteMany: vi.fn() },
}));

vi.mock("@my-ecommerce/db", () => ({
  prisma: {
    product: db.product,
    productTranslation: db.productTranslation,
    productOption: db.productOption,
    productOptionValue: db.productOptionValue,
    productVariant: db.productVariant,
    media: db.media,
    productCategory: db.productCategory,
    // The real one hands its callback a transaction client; this hands it the
    // same stand-ins, which is all the code under test can tell.
    $transaction: (run: (tx: unknown) => unknown) => run(db),
  },
}));

function payload(overrides: Partial<AdminProductCreate> = {}): AdminProductCreate {
  return {
    name: "Studio Over-Ear",
    shortDescription: "Closed-back, tuned flat.",
    description: "## Materials",
    categoryId: "cat_1",
    attributes: [{ kind: "color", values: ["Black", "Sand"] }],
    variants: [
      {
        color: "Black",
        sku: "STUDIO-BLK",
        price: { amount: "79.00", currency: "USD" },
        stock: 12,
        mediaIds: ["media_1", "media_2"],
      },
    ],
    ...overrides,
  };
}

/** What `product.create` returns: the row plus the option values it created. */
function createdProduct() {
  return {
    id: "prod_1",
    options: [
      {
        values: [
          { id: "val_black", translations: [{ locale: "en", name: "Black" }] },
          { id: "val_sand", translations: [{ locale: "en", name: "Sand" }] },
        ],
      },
    ],
  };
}

/**
 * A unique violation as the driver adapter reports it.
 *
 * Copied from a real one: Prisma's own `meta.target` is not what arrives when a
 * driver adapter is doing the work, which is the only reason this is written
 * out rather than inferred.
 */
function uniqueViolation(modelName: string, constraint: string) {
  return Object.assign(new Error("Unique constraint failed"), {
    code: "P2002",
    meta: {
      modelName,
      driverAdapterError: { cause: { constraint: { index: constraint } } },
    },
  });
}

/**
 * A foreign key that names no row, as Prisma reports it.
 *
 * `P2003` is what a `category_id` pointing at nothing produces, and it is the
 * one failure of these writes the payload had no way to rule out — the row it
 * names may have been deleted since the form was rendered.
 */
function missingCategory() {
  return Object.assign(new Error("Foreign key constraint violated"), {
    code: "P2003",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  db.product.create.mockResolvedValue(createdProduct());
  db.productVariant.create.mockResolvedValue({ id: "var_1" });
  db.media.updateMany.mockResolvedValue({ count: 1 });
  db.product.findMany.mockResolvedValue([]);
  db.product.findUnique.mockResolvedValue(null);
  db.product.update.mockResolvedValue({});
  db.product.updateMany.mockResolvedValue({ count: 1 });
  db.productTranslation.upsert.mockResolvedValue({});
  db.productOption.findMany.mockResolvedValue([]);
  db.productOption.create.mockResolvedValue({ id: "opt_new" });
  db.productOption.update.mockResolvedValue({});
  db.productOption.delete.mockResolvedValue({});
  db.productOptionValue.create.mockResolvedValue({ id: "val_new" });
  db.productOptionValue.update.mockResolvedValue({});
  db.productOptionValue.delete.mockResolvedValue({});
  db.productVariant.create.mockResolvedValue({ id: "var_1" });
  db.productVariant.update.mockResolvedValue({ id: "var_1" });
  db.productVariant.findFirst.mockResolvedValue(null);
  db.productVariant.deleteMany.mockResolvedValue({ count: 0 });
  db.media.deleteMany.mockResolvedValue({ count: 0 });
  db.productCategory.create.mockResolvedValue({});
  db.productCategory.deleteMany.mockResolvedValue({ count: 1 });
});

describe("createProduct", () => {
  it("stores the product and returns its id", async () => {
    await expect(createProduct(payload())).resolves.toBe("prod_1");
  });

  it("derives the slug from the name", async () => {
    await createProduct(payload({ name: "Café Over-Ear" }));

    expect(db.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          translations: {
            create: expect.objectContaining({ slug: "cafe-over-ear" }),
          },
        }),
      }),
    );
  });

  it("lists the product in the category it was given", async () => {
    // One join row, nested in the product's own insert: the category is a row
    // that already exists, so nothing waits on an id this write mints.
    await createProduct(payload({ categoryId: "cat_7" }));

    expect(db.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categories: { create: [{ categoryId: "cat_7" }] },
        }),
      }),
    );
  });

  it("reports a category that is not a row", async () => {
    // The foreign key is the database's answer to a question the payload cannot
    // ask. It is not a slug problem, so it must not be swallowed by the retry —
    // a hundred attempts would end in a sentence about the wrong field, and the
    // product would be saved uncategorised, which is the one thing the field's
    // rule exists to prevent.
    db.product.create.mockRejectedValue(missingCategory());

    await expect(createProduct(payload())).rejects.toBeInstanceOf(
      UnknownCategoryError,
    );
    expect(db.product.create).toHaveBeenCalledTimes(1);
  });

  it("hangs the variant off the option value its colour names", async () => {
    await createProduct(payload());

    expect(db.productVariant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sku: "STUDIO-BLK",
        productId: "prod_1",
        optionValues: { create: { optionValueId: "val_black" } },
      }),
    });
  });

  it("claims the uploaded images, in the order they were arranged", async () => {
    // The rows were inserted before the product existed, so the link and the
    // order are made here — and `position` is the whole record of it.
    await createProduct(payload());

    expect(db.media.updateMany.mock.calls).toEqual([
      [
        {
          where: { id: "media_1" },
          data: { productId: "prod_1", variantId: "var_1", position: 0 },
        },
      ],
      [
        {
          where: { id: "media_2" },
          data: { productId: "prod_1", variantId: "var_1", position: 1 },
        },
      ],
    ]);
  });

  it("matches a colour on this locale's name, not another language's", async () => {
    // The translations come back for every locale one day; matching on the
    // wrong one would attach a variant to whatever the first row happened to
    // say.
    db.product.create.mockResolvedValue({
      id: "prod_1",
      options: [
        {
          values: [
            { id: "val_de", translations: [{ locale: "de", name: "Black" }] },
            { id: "val_en", translations: [{ locale: "en", name: "Black" }] },
          ],
        },
      ],
    });

    await createProduct(payload());

    expect(db.productVariant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ optionValues: { create: { optionValueId: "val_en" } } }),
    });
  });

  it("creates no variant for a colour the product does not offer", async () => {
    // Unreachable through the form — the shared schema refuses it — so it is
    // skipped rather than thrown over, and the product still saves.
    await createProduct(
      payload({ variants: [{ color: "Clay", mediaIds: [] }] }),
    );

    expect(db.productVariant.create).not.toHaveBeenCalled();
  });

  it("tries the next slug when the first one is taken", async () => {
    // The unique constraint is the only thing that actually knows a slug is
    // taken, so the insert is what asks it — and the answer is a retry, not a
    // failure.
    db.product.create
      .mockRejectedValueOnce(
        uniqueViolation("ProductTranslation", "product_translations_locale_slug_key"),
      )
      .mockResolvedValueOnce(createdProduct());

    await expect(createProduct(payload())).resolves.toBe("prod_1");

    const slugs = db.product.create.mock.calls.map(
      (call) =>
        (call[0] as { data: { translations: { create: { slug: string } } } }).data
          .translations.create.slug,
    );
    expect(slugs).toEqual(["studio-over-ear", "studio-over-ear-2"]);
  });

  it("gives up once every slug it can think of is taken", async () => {
    // A loop against a database needs a bound, and a bound that is reached
    // needs to say so rather than return nothing.
    db.product.create.mockRejectedValue(
      uniqueViolation("ProductTranslation", "product_translations_locale_slug_key"),
    );

    await expect(createProduct(payload())).rejects.toBeInstanceOf(
      SlugExhaustedError,
    );
  });

  it("reports a taken SKU as something a person can act on", async () => {
    // The payload's own schema checks SKUs against each other; only the
    // database knows what else is in the catalogue, so this is the first point
    // at which the collision is knowable at all.
    db.productVariant.create.mockRejectedValue(
      uniqueViolation("ProductVariant", "product_variants_sku_key"),
    );

    await expect(createProduct(payload())).rejects.toBeInstanceOf(
      DuplicateSkuError,
    );
  });

  it("does not mistake a taken SKU for a taken slug", async () => {
    // The two are told apart by which constraint was named. Confusing them
    // would retry a hundred times over a problem no slug can fix.
    db.productVariant.create.mockRejectedValue(
      uniqueViolation("ProductVariant", "product_variants_sku_key"),
    );

    await expect(createProduct(payload())).rejects.toBeInstanceOf(
      DuplicateSkuError,
    );
    expect(db.product.create).toHaveBeenCalledTimes(1);
  });

  it("recognises a violation Prisma reported in its own shape", async () => {
    // The engine's `meta.target` rather than the adapter's cause, so that
    // swapping the adapter does not silently turn every collision into an
    // unrecognised error.
    db.product.create.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), {
        code: "P2002",
        meta: { target: ["locale", "slug"] },
      }),
    );

    await expect(createProduct(payload())).rejects.toBeInstanceOf(
      SlugExhaustedError,
    );
  });

  it("does not retry an error that is not a collision", async () => {
    // A database that is not running, or a query that is wrong. Retrying would
    // hide it behind a hundred attempts and then report the wrong problem.
    const failure = new Error("connection refused");
    db.product.create.mockRejectedValue(failure);

    await expect(createProduct(payload())).rejects.toBe(failure);
    expect(db.product.create).toHaveBeenCalledTimes(1);
  });

  it("does not mistake a thrown non-Error for a collision", async () => {
    // `throw "boom"` and `throw null` are both legal, and reading `.code` off
    // either is how a classifier turns an odd failure into a retry loop.
    db.product.create.mockRejectedValue("boom");

    await expect(createProduct(payload())).rejects.toBe("boom");
    expect(db.product.create).toHaveBeenCalledTimes(1);

    db.product.create.mockReset();
    db.product.create.mockRejectedValue(null);

    await expect(createProduct(payload())).rejects.toBeNull();
    expect(db.product.create).toHaveBeenCalledTimes(1);
  });
});

describe("listProducts", () => {
  it("reads the newest first", async () => {
    await listProducts();

    expect(db.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } }),
    );
  });

  it("reduces a row to what the list shows", async () => {
    db.product.findMany.mockResolvedValue([
      {
        id: "prod_1",
        status: "draft",
        translations: [
          {
            name: "Studio Over-Ear",
            shortDescription: "Closed-back.",
          },
        ],
        options: [
          {
            translations: [{ name: "Color" }],
            values: [
              { translations: [{ name: "Black" }] },
              { translations: [{ name: "Sand" }] },
            ],
          },
        ],
        variants: [
          { priceAmount: "79.00", priceCurrency: "USD" },
          { priceAmount: "89.00", priceCurrency: "USD" },
        ],
        media: [{ id: "media_1" }, { id: "media_2" }],
      },
    ]);

    expect(await listProducts()).toEqual([
      {
        id: "prod_1",
        name: "Studio Over-Ear",
        shortDescription: "Closed-back.",
        status: "draft",
        prices: [
          { amount: "79.00", currency: "USD" },
          { amount: "89.00", currency: "USD" },
        ],
        options: [{ name: "Color", values: ["Black", "Sand"] }],
        imageCount: 2,
      },
    ]);
  });

  it("leaves an unpriced variant out of the prices", async () => {
    // A dash on the list is the honest answer for a product nobody has costed,
    // and it comes from there being no prices rather than from a zero.
    db.product.findMany.mockResolvedValue([
      {
        id: "prod_1",
        status: "draft",
        translations: [{ name: "Untitled", shortDescription: "" }],
        options: [],
        variants: [
          { priceAmount: null, priceCurrency: null },
          { priceAmount: "79.00", priceCurrency: "USD" },
        ],
        media: [],
      },
    ]);

    const [product] = await listProducts();

    expect(product?.prices).toEqual([{ amount: "79.00", currency: "USD" }]);
  });

  it("survives an option or a value with no translation", async () => {
    // Same reasoning as the row below: not something this app writes, and a
    // list that crashes on it is worse than one with a gap.
    db.product.findMany.mockResolvedValue([
      {
        id: "prod_1",
        status: "draft",
        translations: [{ name: "Studio Over-Ear", shortDescription: "" }],
        options: [
          { translations: [], values: [{ translations: [] }] },
        ],
        variants: [],
        media: [],
      },
    ]);

    const [product] = await listProducts();

    expect(product?.options).toEqual([{ name: "", values: [""] }]);
  });

  it("survives a row with no translation in this locale", async () => {
    // Not a state this app can produce — every create writes one — but a list
    // that crashes on a hand-inserted row is worse than one with a gap in it.
    db.product.findMany.mockResolvedValue([
      {
        id: "prod_1",
        status: "draft",
        translations: [],
        options: [],
        variants: [],
        media: [],
      },
    ]);

    const [product] = await listProducts();

    expect(product?.name).toBe("");
  });
});

describe("setProductStatus", () => {
  it("writes the status it was given", async () => {
    await setProductStatus("prod_1", "active");

    expect(db.product.updateMany).toHaveBeenCalledWith({
      where: { id: "prod_1" },
      data: { status: "active" },
    });
  });

  it("answers how many rows it moved", async () => {
    // The list turns this into "no such product" — a `where` that matched
    // nothing is not an exception, and pretending it succeeded would leave a
    // button that appears to work on a product that is gone.
    expect(await setProductStatus("prod_1", "draft")).toBe(1);

    db.product.updateMany.mockResolvedValue({ count: 0 });
    expect(await setProductStatus("gone", "draft")).toBe(0);
  });
});

describe("getProductForEdit", () => {
  const row = {
    id: "prod_1",
    status: "draft",
    updatedAt: new Date("2026-10-15T08:00:00.000Z"),
    translations: [
      {
        name: "Studio Over-Ear",
        slug: "studio-over-ear",
        shortDescription: "Closed-back.",
        description: "## Materials",
      },
    ],
    options: [
      {
        id: "opt_1",
        kind: "color",
        values: [
          {
            id: "val_1",
            translations: [{ locale: "en", name: "Black" }],
            _count: { variants: 1 },
          },
        ],
      },
    ],
    variants: [
      {
        sku: "STUDIO-BLK",
        priceAmount: "79.00",
        priceCurrency: "USD",
        stock: 12,
        optionValues: [
          {
            optionValue: {
              id: "val_1",
              translations: [{ locale: "en", name: "Black" }],
            },
          },
        ],
        media: [{ id: "media_1" }, { id: "media_2" }],
      },
    ],
    categories: [{ categoryId: "cat_1" }],
  };

  it("loads the copy from the translation, not from the product", async () => {
    db.product.findUnique.mockResolvedValue(row);

    expect(await getProductForEdit("prod_1")).toEqual({
      id: "prod_1",
      status: "draft",
      // What the edit page keys the form by: the row's own timestamp has to
      // reach the screen, or a form that was already mounted keeps its values.
      updatedAt: "2026-10-15T08:00:00.000Z",
      name: "Studio Over-Ear",
      shortDescription: "Closed-back.",
      description: "## Materials",
      slug: "studio-over-ear",
      // The category the form will open on — the row the dropdown selects.
      categoryId: "cat_1",
      attributes: [
        {
          id: "opt_1",
          kind: "color",
          values: [{ id: "val_1", name: "Black", variants: 1 }],
        },
      ],
      // In the form's units, not the database's: a price as the string a text
      // box contains and a stock figure as one too, because the screen that
      // loads this is the create screen and cannot tell the difference.
      variants: [
        {
          color: "Black",
          sku: "STUDIO-BLK",
          price: "79.00",
          stock: "12",
          mediaIds: ["media_1", "media_2"],
        },
      ],
    });
  });

  it("counts the variants each value selects", async () => {
    // The edit screen warns from this: removing a word and removing a price,
    // a stock figure and some photographs are different things, and only the
    // count tells them apart.
    db.product.findUnique.mockResolvedValue(row);

    const product = await getProductForEdit("prod_1");

    expect(product?.attributes[0]?.values[0]?.variants).toBe(1);
  });

  it("answers null for an id that names nothing", async () => {
    // The id is in the URL, and a URL anyone can type is one anyone can get
    // wrong; the page turns this into a 404.
    expect(await getProductForEdit("nope")).toBeNull();
  });

  it("answers null for a product in no category", async () => {
    // The state of every product stored before the field existed. The form
    // opens on "choose one" and will not save until it is answered — which is
    // better than a screen that opens on a category the product is not in.
    db.product.findUnique.mockResolvedValue({ ...row, categories: [] });

    const product = await getProductForEdit("prod_1");

    expect(product?.categoryId).toBeNull();
  });

  it("opens an empty form for a row with no translation in this locale", async () => {
    // Not something this app writes — saving fills it in — but a form that
    // crashed on it would be a worse answer than a blank one.
    db.product.findUnique.mockResolvedValue({ ...row, translations: [], variants: [] });

    const product = await getProductForEdit("prod_1");

    expect(product?.name).toBe("");
    expect(product?.description).toBe("");
  });
});

describe("updateProduct", () => {
  /** The payload the form sends, in the shape the create form assembles. */
  function payload(
    overrides: Partial<AdminProductCreate> = {},
  ): AdminProductCreate {
    return {
      name: "Studio Over-Ear",
      shortDescription: "Closed-back.",
      description: "## Materials",
      categoryId: "cat_1",
      attributes: [{ kind: "color", values: ["Black", "Sand"] }],
      variants: [
        {
          color: "Black",
          sku: "STUDIO-BLK",
          price: { amount: "79.00", currency: "USD" },
          stock: 12,
          mediaIds: ["media_1"],
        },
      ],
      ...overrides,
    };
  }

  /** What the product holds: one colour option with one value, and a variant. */
  function existing() {
    db.productOption.findMany.mockResolvedValue([
      {
        id: "opt_1",
        kind: "color",
        values: [
          { id: "val_1", translations: [{ locale: "en", name: "Black" }] },
        ],
      },
    ]);
  }

  it("rewrites the copy rather than making a second translation", async () => {
    existing();

    await updateProduct("prod_1", payload({ name: "Studio Wireless" }));

    expect(db.productTranslation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId_locale: { productId: "prod_1", locale: "en" } },
        update: expect.objectContaining({
          name: "Studio Wireless",
          slug: "studio-wireless",
        }),
      }),
    );
  });

  it("moves the product into the category the screen chose", async () => {
    // The screen owns the whole set, and the set it can express is one row:
    // what the product was in comes off, and what the dropdown says goes on.
    existing();

    await updateProduct("prod_1", payload({ categoryId: "cat_2" }));

    expect(db.productCategory.deleteMany).toHaveBeenCalledWith({
      where: { productId: "prod_1" },
    });
    expect(db.productCategory.create).toHaveBeenCalledWith({
      data: { productId: "prod_1", categoryId: "cat_2" },
    });
  });

  it("reports a category that is not a row", async () => {
    // Same as the create path: a foreign key naming nothing is a sentence about
    // the field, not a retry and not "check the server is running".
    existing();
    db.productCategory.create.mockRejectedValue(missingCategory());

    await expect(updateProduct("prod_1", payload())).rejects.toBeInstanceOf(
      UnknownCategoryError,
    );
  });

  it("tries the next slug when the name is taken", async () => {
    existing();
    db.productTranslation.upsert
      .mockRejectedValueOnce(
        uniqueViolation("ProductTranslation", "product_translations_locale_slug_key"),
      )
      .mockResolvedValueOnce({});

    await expect(updateProduct("prod_1", payload())).resolves.toBeUndefined();

    const slugs = db.productTranslation.upsert.mock.calls.map(
      (call) => (call[0] as { update: { slug: string } }).update.slug,
    );
    expect(slugs).toEqual(["studio-over-ear", "studio-over-ear-2"]);
  });

  it("changes a colour's price and stock on the variant it already has", async () => {
    // The path a person actually takes: open the edit screen, change a number,
    // save. Nothing about the colour changed, so nothing about its row should.
    existing();
    db.productVariant.findFirst.mockResolvedValue({ id: "var_1" });

    await updateProduct("prod_1", payload());

    expect(db.productVariant.update).toHaveBeenCalledWith({
      where: { id: "var_1" },
      data: {
        sku: "STUDIO-BLK",
        priceAmount: "79.00",
        priceCurrency: "USD",
        stock: 12,
      },
    });
    expect(db.productVariant.create).not.toHaveBeenCalled();
    expect(db.productVariant.deleteMany).not.toHaveBeenCalled();
  });

  it("creates a variant for a colour that has none", async () => {
    existing();
    db.productVariant.findFirst.mockResolvedValue(null);
    db.productVariant.create.mockResolvedValue({ id: "var_2" });

    await updateProduct("prod_1", payload());

    expect(db.productVariant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: "prod_1",
        sku: "STUDIO-BLK",
        optionValues: { create: { optionValueId: "val_1" } },
      }),
    });
  });

  it("claims the images in the order the row shows them", async () => {
    existing();
    db.productVariant.findFirst.mockResolvedValue({ id: "var_1" });

    await updateProduct("prod_1", payload());

    expect(db.media.updateMany).toHaveBeenCalledWith({
      where: { id: "media_1" },
      data: { productId: "prod_1", variantId: "var_1", position: 0 },
    });
  });

  it("deletes the images that were taken off the form", async () => {
    // An upload belongs to one row and is claimed by one save. An image nobody
    // is showing any more is a file nothing can find.
    existing();
    db.productVariant.findFirst.mockResolvedValue({ id: "var_1" });

    await updateProduct("prod_1", payload());

    expect(db.media.deleteMany).toHaveBeenCalledWith({
      where: { productId: "prod_1", id: { notIn: ["media_1"] } },
    });
  });

  it("adds a colour that appeared in the box", async () => {
    existing();

    await updateProduct("prod_1", payload());

    expect(db.productOptionValue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        optionId: "opt_1",
        position: 1,
        translations: { create: { locale: "en", name: "Sand" } },
      }),
    });
  });

  it("deletes a colour the box no longer lists, and its variant", async () => {
    // Renaming is replacing: the word in the box is the identity the form has,
    // and the row for a renamed colour comes up empty before anyone saves.
    existing();

    await updateProduct(
      "prod_1",
      payload({
        attributes: [{ kind: "color", values: ["Sand"] }],
        variants: [],
      }),
    );

    expect(db.productVariant.deleteMany).toHaveBeenCalledWith({
      where: { optionValues: { some: { optionValueId: "val_1" } } },
    });
    expect(db.productOptionValue.delete).toHaveBeenCalledWith({
      where: { id: "val_1" },
    });
  });

  it("deletes an attribute the product is no longer offered in", async () => {
    existing();

    await updateProduct("prod_1", payload({ attributes: [], variants: [] }));

    expect(db.productOption.delete).toHaveBeenCalledWith({
      where: { id: "opt_1" },
    });
  });

  it("adds an attribute that was not there before", async () => {
    existing();

    await updateProduct(
      "prod_1",
      payload({
        attributes: [
          { kind: "color", values: ["Black"] },
          { kind: "size", values: ["M"] },
        ],
        variants: [],
      }),
    );

    expect(db.productOption.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ kind: "size", position: 1 }),
    });
  });

  it("moves the product's own timestamp", async () => {
    // Everything a product is made of lives in other tables, so without this
    // the row would say it had not changed since it was created — and the edit
    // screen keys the form by it, which is what makes a saved product show what
    // was saved rather than what the form first mounted with.
    existing();

    await updateProduct("prod_1", payload());

    expect(db.product.update).toHaveBeenCalledWith({
      where: { id: "prod_1" },
      data: { updatedAt: expect.any(Date) },
    });
  });

  it("does not retry an error that is not a collision", async () => {
    const failure = new Error("connection refused");
    db.productTranslation.upsert.mockRejectedValue(failure);

    await expect(updateProduct("prod_1", payload())).rejects.toBe(failure);
    expect(db.productTranslation.upsert).toHaveBeenCalledTimes(1);
  });
});
