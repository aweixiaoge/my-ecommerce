import { beforeEach, describe, expect, it, vi } from "vitest";
import { listReviewsForModeration, setReviewStatus } from "./reviews-repo";

/**
 * The moderation reads, against a stand-in for the database.
 *
 * The lane has no external services (`.claude/tdd-guardian/config.json`), so
 * what is worth asserting is the shape of each query and what a row becomes on
 * the screen — including the two things this file is the *only* place allowed
 * to do: read the reviewer's email, and name the product a review is about.
 */
const db = vi.hoisted(() => ({
  review: { findMany: vi.fn(), updateMany: vi.fn() },
}));

vi.mock("@my-ecommerce/db", () => ({ prisma: { review: db.review } }));

/** A row as the queue's select returns one. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "rev_1",
    rating: 4,
    body: "Works well.",
    status: "pending",
    createdAt: new Date("2026-10-12T09:30:00.000Z"),
    authorName: "Ada",
    authorEmail: "ada@example.com",
    product: {
      id: "prod_1",
      translations: [{ name: "Earbud Wireless" }],
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.review.findMany.mockResolvedValue([]);
  db.review.updateMany.mockResolvedValue({ count: 1 });
});

describe("listReviewsForModeration", () => {
  it("takes every review, newest first, decided ones included", async () => {
    // A queue that emptied itself on approval would make the decision final
    // and invisible; a moderator who approves the wrong row has to find it.
    await listReviewsForModeration();

    expect(db.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
    );

    const [args] = db.review.findMany.mock.calls[0] as [
      { where?: unknown; select: Record<string, boolean> },
    ];
    expect(args.where).toBeUndefined();
    // The two the storefront's read refuses.
    expect(args.select.authorEmail).toBe(true);
    expect(args.select.authorName).toBe(true);
  });

  it("names the product in the display locale", async () => {
    db.review.findMany.mockResolvedValue([row()]);

    const [review] = await listReviewsForModeration();

    expect(review?.productName).toBe("Earbud Wireless");
    expect(review?.createdAt).toBe("2026-10-12T09:30:00.000Z");
    expect(review?.authorEmail).toBe("ada@example.com");
  });

  it("leaves the product blank when this locale has no name for it", async () => {
    // A review of a row nobody has translated is still a review somebody has
    // to moderate — an unnamed product is a gap in a cell, not a crash.
    db.review.findMany.mockResolvedValue([
      row({ product: { id: "prod_2", translations: [] } }),
    ]);

    const [review] = await listReviewsForModeration();

    expect(review?.productName).toBe("");
  });
});

describe("setReviewStatus", () => {
  it("moves one review to a decision and reports whether it landed", async () => {
    expect(await setReviewStatus("rev_1", "approved")).toBe(1);

    expect(db.review.updateMany).toHaveBeenCalledWith({
      where: { id: "rev_1" },
      data: { status: "approved" },
    });
  });

  it("is a no-op rather than an error when the review is already gone", async () => {
    // `updateMany`, so a row deleted in another tab between the render and the
    // click answers with a count instead of throwing.
    db.review.updateMany.mockResolvedValue({ count: 0 });

    expect(await setReviewStatus("rev_gone", "rejected")).toBe(0);
  });
});
