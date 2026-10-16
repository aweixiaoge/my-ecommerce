import { prisma } from "@my-ecommerce/db";
import type { Review, ReviewCreate } from "@my-ecommerce/shared";
import { DEFAULT_LOCALE } from "../locale";
import {
  REVIEW_SELECT,
  toProductRatings,
  toReview,
  type RatingLookup,
} from "./review-rows";

/**
 * Where the storefront reads reviews, rates products from them, and stores a
 * new one.
 *
 * The ratings are a query of their own rather than a count riding along on the
 * product select. Prisma can put a filtered relation `_count` on a product row,
 * but an *average* it cannot, and asking for one of the two figures in each
 * place is how a card and the page it links to end up disagreeing about what a
 * product is rated. One `groupBy` answers both, and both reads call it.
 */

/**
 * The approved reviews for one product, newest first.
 *
 * Approved only, and that is the whole of the moderation rule as far as a
 * shopper is concerned: a pending or rejected row is not on the page, and the
 * read that would put it there does not exist.
 *
 * No locale filter. Reviews are user content and are not translated (plan.md),
 * so filtering the list to the display locale would not translate a review
 * written in another language — it would hide it. The row keeps its `locale`
 * for the day the storefront is genuinely multi-language and someone has to
 * decide which reviews a German page shows.
 */
export async function listApprovedReviews(productId: string): Promise<Review[]> {
  const rows = await prisma.review.findMany({
    where: { productId, status: "approved" },
    // Newest first, with the id breaking ties rather than the query plan: a
    // batch of reviews imported with one `created_at` must not reorder itself
    // between two identical requests. The same rule as the product list.
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: REVIEW_SELECT,
  });

  return rows.map(toReview);
}

/**
 * The aggregate score for a set of products, as one `groupBy`.
 *
 * One query for the whole set, not one per product: a shop page asks about
 * every card it is about to draw, and thirty round trips to answer "how many
 * stars" is not a page anybody should wait for.
 *
 * A product with no approved reviews is absent from the result rather than
 * present with zeroes — see `toProductRatings`, where that difference is what
 * becomes `null` on the contract and no stars on the card.
 */
export async function getProductRatings(
  productIds: readonly string[],
): Promise<RatingLookup> {
  // An empty list asks the database nothing. `in: []` would come back empty
  // anyway; this is the round trip it saves, and a listing with nothing on it
  // is an ordinary state rather than an error.
  if (productIds.length === 0) return new Map();

  const groups = await prisma.review.groupBy({
    by: ["productId"],
    where: { productId: { in: [...productIds] }, status: "approved" },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return toProductRatings(groups);
}

/**
 * Stores a submitted review, and answers with its id — or `null` when there is
 * no product to attach it to.
 *
 * The product has to be one the shop is actually selling. A Server Action is
 * reachable by direct POST, so the id in the payload is a stranger's to choose,
 * and a review filed against a draft would be a row whose product page does not
 * exist — invisible forever, and invisible in the admin queue too, since the
 * queue names the product it belongs to. Asking `getProductBySlug`'s question
 * once more, in the place that writes, is cheaper than explaining those rows
 * later.
 *
 * `status: "pending"` is written here rather than left to the column's default,
 * even though the default is the same word. The default is a property of a
 * migration; this line is a property of the code, and "a review submitted
 * through the storefront is never born approved" is worth being able to read.
 *
 * The locale is stamped here rather than taken from the payload, for the reason
 * the shared schema carries no locale: it is a decision about the page being
 * read, and a client that could choose it could file a review under a language
 * nobody wrote it in.
 */
export async function createReview(input: ReviewCreate): Promise<string | null> {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, status: "active" },
    select: { id: true },
  });

  // The lookup and the insert are two statements, so a product archived in
  // between still gets the review. That is the harmless direction: the row is
  // pending, and a moderator is about to look at it anyway.
  if (!product) return null;

  const review = await prisma.review.create({
    data: {
      productId: input.productId,
      authorName: input.authorName,
      authorEmail: input.authorEmail,
      rating: input.rating,
      body: input.body,
      locale: DEFAULT_LOCALE,
      status: "pending",
    },
    select: { id: true },
  });

  return review.id;
}
