import type { Prisma } from "@my-ecommerce/db";
import type { ProductRating, Review } from "@my-ecommerce/shared";

/**
 * What a review row is, and how it becomes the contract's `Review`.
 *
 * A module of its own for the reason `./product-summary.ts` is one: the
 * decisions about what the data *means* live in a file with no database in it,
 * and the query lives in the repository that calls this. It is also what lets
 * the mapping be tested at all, since the unit lane has no Postgres in it.
 */

/**
 * The columns the storefront's read takes — and, more to the point, the one it
 * does not.
 *
 * `authorEmail` is absent deliberately and must stay absent. The address is
 * collected so a moderator can see who wrote something; a read that carried it
 * would put every reviewer's address one careless render away from a public
 * page, and this `select` is the only thing standing between the two.
 *
 * `status` is absent for the same kind of reason: the query filters on it, and a
 * mapper that could read it could learn to branch on it.
 */
export const REVIEW_SELECT = {
  id: true,
  rating: true,
  authorName: true,
  body: true,
  createdAt: true,
} as const satisfies Prisma.ReviewSelect;

/**
 * A row as that read returns it.
 *
 * Derived from the select rather than hand-written, so adding a column to the
 * query is a type error here until something has decided what the review does
 * with it.
 */
export type ReviewRow = Prisma.ReviewGetPayload<{
  select: typeof REVIEW_SELECT;
}>;

/**
 * One row, as the page reads it.
 *
 * No null and no fallback, unlike `toSummary`: every column this reads is
 * `NOT NULL`, so there is no row that arrives without a name, a rating or a
 * body, and a null branch would be a branch nothing could reach.
 */
export function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    rating: row.rating,
    authorName: row.authorName,
    body: row.body,
    // The contract carries a string, and this is what makes it one. A `Date`
    // would serialise as a string anyway — and would fail the schema's
    // `z.iso.datetime()` when it did, which is the point of checking.
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * One group as `prisma.review.groupBy` returns it.
 *
 * Spelled out here rather than derived from the call, because the repository
 * and the mapper are the two ends of one shape and this is the seam between
 * them: the query asks for exactly this and the mapping reads exactly this.
 */
export interface RatingGroup {
  productId: string;
  _avg: { rating: number | null };
  _count: { _all: number };
}

/**
 * Review aggregates, keyed by product id.
 *
 * A `Map` rather than a plain object: the key is a cuid and an object literal
 * would answer for `lookup["constructor"]`. A product with no approved reviews
 * is simply absent from it, which is what keeps "no reviews yet" and "an
 * average of zero" from collapsing into the same value on the way up to the
 * stars.
 */
export type RatingLookup = ReadonlyMap<string, ProductRating>;

/**
 * The aggregate rows, as a summary wants them.
 *
 * The average is rounded to one decimal. Not for arithmetic — nothing adds
 * these up — but because this is the figure `StarRating` reads out to assistive
 * technology, and a raw Postgres `AVG` over 1..5 integers arrives as
 * `4.666666666666667`: a float that escaped rather than a rating. The star row
 * itself rounds to whole stars (there is no half-star layer in the design), so
 * a decimal is already more precision than the one consumer uses.
 *
 * The null guard is unreachable while `reviews.rating` is `NOT NULL` — a group
 * exists only because it has rows, and every row has a rating. It is kept
 * because the alternative, `?? 0`, is `{ average: 0, count: 0 }`, which is the
 * one value the `ProductRating` contract exists to keep distinct from "no
 * reviews".
 */
export function toProductRatings(groups: readonly RatingGroup[]): RatingLookup {
  const ratings = new Map<string, ProductRating>();

  for (const group of groups) {
    const average = group._avg.rating;
    if (average === null) continue;

    ratings.set(group.productId, {
      average: Math.round(average * 10) / 10,
      count: group._count._all,
    });
  }

  return ratings;
}
