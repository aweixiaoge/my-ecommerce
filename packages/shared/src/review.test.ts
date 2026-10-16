import { describe, expect, it } from "vitest";
import {
  AdminReviewModerateSchema,
  ReviewCreateSchema,
  ReviewSchema,
  REVIEW_BODY_MAX,
} from "./review";

/** A submission the storefront's form can actually produce. */
const submission = {
  productId: "prod_1",
  authorName: "Ada",
  authorEmail: "ada@example.com",
  rating: "4",
  body: "Works well.",
};

describe("ReviewCreateSchema", () => {
  it("accepts a submission from the form", () => {
    const result = ReviewCreateSchema.safeParse(submission);

    expect(result.success).toBe(true);
    // Coerced, because every field arrives from a `FormData` as a string.
    expect(result.success && result.data.rating).toBe(4);
  });

  it("trims the name and body, so whitespace alone is empty", () => {
    const result = ReviewCreateSchema.safeParse({
      ...submission,
      authorName: "  Ada  ",
      body: "  Works well.  ",
    });

    expect(result.success && result.data.authorName).toBe("Ada");
    expect(result.success && result.data.body).toBe("Works well.");

    for (const blank of ["", " ", "\t\n"]) {
      expect(
        ReviewCreateSchema.safeParse({ ...submission, body: blank }).success,
      ).toBe(false);
    }
  });

  it("normalises the email's case and padding", () => {
    // What `customers.email` being citext will mean later: the address stored
    // now is the one an account would match, so the comparison is a comparison
    // rather than a normalisation.
    const result = ReviewCreateSchema.safeParse({
      ...submission,
      authorEmail: "  Ada@Example.COM ",
    });

    expect(result.success && result.data.authorEmail).toBe("ada@example.com");
  });

  it("refuses an address that is not one", () => {
    for (const authorEmail of ["nope", "ada@", "@example.com", "ada@example"]) {
      expect(
        ReviewCreateSchema.safeParse({ ...submission, authorEmail }).success,
      ).toBe(false);
    }
  });

  it("refuses a rating outside the five stars the design draws", () => {
    for (const rating of ["0", "6", "2.5", "", "five"]) {
      expect(
        ReviewCreateSchema.safeParse({ ...submission, rating }).success,
      ).toBe(false);
    }
  });

  it("refuses a missing rating rather than reading it as zero", () => {
    // `z.coerce.number()` turns `""` into 0, which `min(1)` then refuses — the
    // point being that an empty star picker is a refusal from one schema and
    // not a silent one-star review.
    expect(
      ReviewCreateSchema.safeParse({ ...submission, rating: undefined }).success,
    ).toBe(false);
  });

  it("refuses an unidentifiable product and an over-long review", () => {
    expect(
      ReviewCreateSchema.safeParse({ ...submission, productId: "" }).success,
    ).toBe(false);
    expect(
      ReviewCreateSchema.safeParse({
        ...submission,
        body: "x".repeat(REVIEW_BODY_MAX + 1),
      }).success,
    ).toBe(false);
  });

  it("carries no way to set the status or the locale", () => {
    // A payload that could approve itself, or file a review under a language
    // nobody wrote it in, is the failure this omits. Unknown keys are dropped
    // rather than refused, so the assertion is on what survives.
    const result = ReviewCreateSchema.safeParse({
      ...submission,
      status: "approved",
      locale: "de",
    });

    expect(result.success && "status" in result.data).toBe(false);
    expect(result.success && "locale" in result.data).toBe(false);
  });
});

describe("ReviewSchema", () => {
  const review = {
    id: "rev_1",
    rating: 4,
    authorName: "Ada",
    body: "Works well.",
    createdAt: "2026-10-12T09:30:00.000Z",
  };

  it("accepts what the page renders", () => {
    expect(ReviewSchema.safeParse(review).success).toBe(true);
  });

  it("refuses a raw Date, which is what a mapper forgetting toISOString sends", () => {
    expect(
      ReviewSchema.safeParse({ ...review, createdAt: new Date() }).success,
    ).toBe(false);
  });

  it("refuses a rating the stars cannot draw", () => {
    for (const rating of [0, 6, 3.5]) {
      expect(ReviewSchema.safeParse({ ...review, rating }).success).toBe(false);
    }
  });
});

describe("AdminReviewModerateSchema", () => {
  it("accepts the two decisions the buttons mean", () => {
    expect(
      AdminReviewModerateSchema.safeParse({ id: "rev_1", status: "approved" })
        .success,
    ).toBe(true);
    expect(
      AdminReviewModerateSchema.safeParse({ id: "rev_1", status: "rejected" })
        .success,
    ).toBe(true);
  });

  it("refuses to put a review back in the queue", () => {
    // There is no screen behind "un-moderate", and a crafted POST that could
    // reverse a decision would make moderation quietly undoable.
    expect(
      AdminReviewModerateSchema.safeParse({ id: "rev_1", status: "pending" })
        .success,
    ).toBe(false);
  });

  it("refuses a missing or unidentifiable review", () => {
    expect(
      AdminReviewModerateSchema.safeParse({ status: "approved" }).success,
    ).toBe(false);
    expect(
      AdminReviewModerateSchema.safeParse({ id: "", status: "approved" })
        .success,
    ).toBe(false);
  });
});
