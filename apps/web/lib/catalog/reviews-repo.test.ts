import { beforeEach, describe, expect, it, vi } from "vitest";
import { createReview, getProductRatings, listApprovedReviews } from "./reviews-repo";

/**
 * The review queries, against a stand-in for the database.
 *
 * The lane has no external services (`.claude/tdd-guardian/config.json`), so
 * what is worth asserting is the shape of each query — which rows it will
 * accept, and which columns it refuses to read — plus what the answer becomes.
 */
const db = vi.hoisted(() => ({
  review: { findMany: vi.fn(), groupBy: vi.fn(), create: vi.fn() },
  product: { findFirst: vi.fn() },
}));

vi.mock("@my-ecommerce/db", () => ({
  prisma: { review: db.review, product: db.product },
}));

/** A row as `REVIEW_SELECT` returns one. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "rev_1",
    rating: 4,
    authorName: "Ada",
    body: "Works well.",
    createdAt: new Date("2026-10-12T09:30:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.review.findMany.mockResolvedValue([]);
  db.review.groupBy.mockResolvedValue([]);
  db.review.create.mockResolvedValue({ id: "rev_new" });
  db.product.findFirst.mockResolvedValue(null);
});

describe("listApprovedReviews", () => {
  it("asks for one product's approved reviews, newest first", async () => {
    db.review.findMany.mockResolvedValue([row()]);

    await listApprovedReviews("prod_1");

    expect(db.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: "prod_1", status: "approved" },
        // The id breaks ties rather than the query plan: reviews imported in
        // one batch share a `created_at`, and their order must not shuffle
        // between two identical requests.
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
    );
  });

  it("never asks for the reviewer's email", async () => {
    // The address is what a moderator checks; the storefront's read is the one
    // place it must not appear, and this select is the whole of that rule.
    await listApprovedReviews("prod_1");

    const [args] = db.review.findMany.mock.calls[0] as [
      { select: Record<string, boolean> },
    ];
    expect(args.select.authorEmail).toBeUndefined();
  });

  it("maps rows to the contract", async () => {
    db.review.findMany.mockResolvedValue([row(), row({ id: "rev_2", rating: 2 })]);

    const reviews = await listApprovedReviews("prod_1");

    expect(reviews).toEqual([
      {
        id: "rev_1",
        rating: 4,
        authorName: "Ada",
        body: "Works well.",
        createdAt: "2026-10-12T09:30:00.000Z",
      },
      {
        id: "rev_2",
        rating: 2,
        authorName: "Ada",
        body: "Works well.",
        createdAt: "2026-10-12T09:30:00.000Z",
      },
    ]);
  });
});

describe("getProductRatings", () => {
  it("asks the database nothing when there are no products to ask about", async () => {
    // A listing with nothing on it is an ordinary state, not a query.
    const ratings = await getProductRatings([]);

    expect(ratings.size).toBe(0);
    expect(db.review.groupBy).not.toHaveBeenCalled();
  });

  it("groups approved reviews of every product asked about", async () => {
    db.review.groupBy.mockResolvedValue([
      { productId: "prod_1", _avg: { rating: 4.666666666666667 }, _count: { _all: 3 } },
    ]);

    const ratings = await getProductRatings(["prod_1", "prod_2"]);

    expect(db.review.groupBy).toHaveBeenCalledWith({
      by: ["productId"],
      where: { productId: { in: ["prod_1", "prod_2"] }, status: "approved" },
      _avg: { rating: true },
      _count: { _all: true },
    });
    expect(ratings.get("prod_1")).toEqual({ average: 4.7, count: 3 });
    // Nothing approved yet: absent rather than zero, which is what renders no
    // stars instead of one out of five.
    expect(ratings.has("prod_2")).toBe(false);
  });
});

describe("createReview", () => {
  const input = {
    productId: "prod_1",
    authorName: "Ada",
    authorEmail: "ada@example.com",
    rating: 4,
    body: "Works well.",
  };

  it("refuses to file a review against a product nobody is selling", async () => {
    // The action that calls this is reachable by direct POST, so the id is a
    // stranger's to choose. A review on a draft would be invisible on the
    // storefront and unidentifiable in the admin queue.
    db.product.findFirst.mockResolvedValue(null);

    expect(await createReview(input, "en")).toBeNull();
    expect(db.review.create).not.toHaveBeenCalled();
    expect(db.product.findFirst).toHaveBeenCalledWith({
      where: { id: "prod_1", status: "active" },
      select: { id: true },
    });
  });

  it("stores a pending review in the display locale", async () => {
    db.product.findFirst.mockResolvedValue({ id: "prod_1" });

    const id = await createReview(input, "en");

    expect(id).toBe("rev_new");
    expect(db.review.create).toHaveBeenCalledWith({
      data: {
        productId: "prod_1",
        authorName: "Ada",
        authorEmail: "ada@example.com",
        rating: 4,
        body: "Works well.",
        locale: "en",
        // Written rather than left to the column's default: "a review
        // submitted through the storefront is never born approved" should be
        // readable in the code that submits it.
        status: "pending",
      },
      select: { id: true },
    });
  });
});
