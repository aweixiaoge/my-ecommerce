import { describe, expect, it } from "vitest";
import { ReviewSchema } from "@my-ecommerce/shared";
import { toProductRatings, toReview } from "./review-rows";

/**
 * The review mapping, with no database anywhere near it.
 *
 * The file is pure, so what is worth testing is what a row becomes on the page
 * and what an aggregate becomes on a card — including the difference between a
 * product nobody has reviewed and one whose reviews happen to average zero.
 */

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

describe("toReview", () => {
  it("maps a row to the contract, date and all", () => {
    const review = toReview(row());

    expect(review).toEqual({
      id: "rev_1",
      rating: 4,
      authorName: "Ada",
      body: "Works well.",
      createdAt: "2026-10-12T09:30:00.000Z",
    });
    // The contract is what the page renders, so the mapping's output has to
    // satisfy it rather than merely resemble it.
    expect(ReviewSchema.safeParse(review).success).toBe(true);
  });

  it("carries no email, even when the row it was given has one", () => {
    // Defensive on purpose: the storefront's select does not ask for the
    // address, and this asserts the second line of that defence — a mapper that
    // spread the row would leak it the day someone widened the select.
    const review = toReview(
      row({ authorEmail: "ada@example.com" }) as Parameters<typeof toReview>[0],
    );

    expect("authorEmail" in review).toBe(false);
  });
});

describe("toProductRatings", () => {
  it("keys the aggregate by product", () => {
    const ratings = toProductRatings([
      { productId: "prod_1", _avg: { rating: 5 }, _count: { _all: 1 } },
      { productId: "prod_2", _avg: { rating: 3 }, _count: { _all: 4 } },
    ]);

    expect(ratings.get("prod_1")).toEqual({ average: 5, count: 1 });
    expect(ratings.get("prod_2")).toEqual({ average: 3, count: 4 });
  });

  it("rounds the average to one decimal", () => {
    // What a raw `AVG` over integers looks like: the figure reaches assistive
    // technology through `StarRating`'s label, and a float that escaped is not
    // a rating anybody reads out.
    const ratings = toProductRatings([
      { productId: "prod_1", _avg: { rating: 4.666666666666667 }, _count: { _all: 3 } },
      { productId: "prod_2", _avg: { rating: 4.25 }, _count: { _all: 4 } },
    ]);

    expect(ratings.get("prod_1")?.average).toBe(4.7);
    expect(ratings.get("prod_2")?.average).toBe(4.3);
  });

  it("says nothing about a product whose average came back null", () => {
    // Unreachable while `rating` is NOT NULL, and kept because the alternative
    // — reading it as zero — is the one value the contract exists to keep
    // distinct from "no reviews yet".
    const ratings = toProductRatings([
      { productId: "prod_1", _avg: { rating: null }, _count: { _all: 0 } },
    ]);

    expect(ratings.has("prod_1")).toBe(false);
    expect(ratings.size).toBe(0);
  });

  it("is empty when there is nothing to aggregate", () => {
    // The ordinary state for a catalogue nobody has reviewed: absent, not zero.
    expect(toProductRatings([]).size).toBe(0);
  });
});
