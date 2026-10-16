import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listFeaturedProductIds,
  setFeaturedProduct,
} from "./featured-products-repo";

/**
 * The repository, against a stand-in for the database — the same reasoning as
 * `categories-repo.test.ts`: the unit lane has no external services, so what is
 * testable here is everything above the driver. That is the order the list is
 * read in, the statement each state writes, and the one failure an insert can
 * have that an update cannot.
 */
const db = vi.hoisted(() => ({
  featuredProduct: {
    createMany: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("@my-ecommerce/db", () => ({
  prisma: { featuredProduct: db.featuredProduct },
}));

/**
 * The shape of a foreign-key violation as it actually arrives.
 *
 * Built in the driver-adapter shape, like the unique violation in
 * `categories-repo.test.ts`: Prisma reports the model and the index under
 * `meta.driverAdapterError`, not the `meta.target` its own engine would use,
 * and a fixture that got that wrong would test a classifier against an error
 * this app never sees.
 */
function missingProduct() {
  return Object.assign(new Error("Foreign key constraint violated"), {
    code: "P2003",
    meta: {
      modelName: "FeaturedProduct",
      driverAdapterError: {
        cause: {
          constraint: { index: "featured_products_product_id_fkey" },
        },
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  db.featuredProduct.findMany.mockResolvedValue([]);
  db.featuredProduct.createMany.mockResolvedValue({ count: 1 });
  db.featuredProduct.deleteMany.mockResolvedValue({ count: 1 });
});

describe("listFeaturedProductIds", () => {
  it("reads them in the order they were featured", async () => {
    await listFeaturedProductIds();

    // A tiebreak on the id, because two rows featured in the same millisecond
    // would otherwise come back in whatever order Postgres felt like.
    expect(db.featuredProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "asc" }, { productId: "asc" }],
      }),
    );
  });

  it("asks only for the id", async () => {
    // The row carries a timestamp, and the list has no use for it: what the
    // screen asks is whether each product is in the set.
    await listFeaturedProductIds();

    expect(db.featuredProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { productId: true } }),
    );
  });

  it("reduces the rows to ids", async () => {
    db.featuredProduct.findMany.mockResolvedValue([
      { productId: "prod_1" },
      { productId: "prod_2" },
    ]);

    expect(await listFeaturedProductIds()).toEqual(["prod_1", "prod_2"]);
  });

  it("answers an empty list when nothing is featured", async () => {
    expect(await listFeaturedProductIds()).toEqual([]);
  });
});

describe("setFeaturedProduct", () => {
  it("features a product by inserting its row", async () => {
    await expect(setFeaturedProduct("prod_1", true)).resolves.toBe(1);

    // `skipDuplicates` rather than a read first: the primary key is the only
    // thing that actually knows whether the row is already there.
    expect(db.featuredProduct.createMany).toHaveBeenCalledWith({
      data: [{ productId: "prod_1" }],
      skipDuplicates: true,
    });
  });

  it("says nothing happened when the product was already featured", async () => {
    db.featuredProduct.createMany.mockResolvedValue({ count: 0 });

    await expect(setFeaturedProduct("prod_1", true)).resolves.toBe(0);
  });

  it("unfeatures a product by deleting its row", async () => {
    await expect(setFeaturedProduct("prod_1", false)).resolves.toBe(1);

    expect(db.featuredProduct.deleteMany).toHaveBeenCalledWith({
      where: { productId: "prod_1" },
    });
  });

  it("says nothing happened when the product was not featured", async () => {
    db.featuredProduct.deleteMany.mockResolvedValue({ count: 0 });

    await expect(setFeaturedProduct("prod_1", false)).resolves.toBe(0);
  });

  it("treats a product that is not there as nothing to do", async () => {
    // A row pointing at a product that does not exist is the one failure an
    // insert can have that an update cannot, and there is no field on screen to
    // report it against — so it is a no-op, like a delete that matched nothing.
    db.featuredProduct.createMany.mockRejectedValue(missingProduct());

    await expect(setFeaturedProduct("prod_gone", true)).resolves.toBe(0);
    expect(db.featuredProduct.createMany).toHaveBeenCalledTimes(1);
  });

  it("does not swallow a database failure that is not a missing product", async () => {
    // A connection that is down, or a query that is wrong. Answering "nothing
    // happened" would hide it behind a page that looks like a successful click.
    const failure = new Error("connection refused");
    db.featuredProduct.createMany.mockRejectedValue(failure);

    await expect(setFeaturedProduct("prod_1", true)).rejects.toBe(failure);
    expect(db.featuredProduct.createMany).toHaveBeenCalledTimes(1);
  });

  it("does not mistake a thrown non-Error for a missing product", async () => {
    // `throw "boom"` and `throw null` are both legal, and reading `.code` off
    // either is how a classifier turns an odd failure into a swallowed one.
    db.featuredProduct.createMany.mockRejectedValue("boom");

    await expect(setFeaturedProduct("prod_1", true)).rejects.toBe("boom");
    expect(db.featuredProduct.createMany).toHaveBeenCalledTimes(1);

    db.featuredProduct.createMany.mockReset();
    db.featuredProduct.createMany.mockRejectedValue(null);

    await expect(setFeaturedProduct("prod_1", true)).rejects.toBeNull();
    expect(db.featuredProduct.createMany).toHaveBeenCalledTimes(1);
  });
});
