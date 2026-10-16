import { prisma, type ReviewStatus } from "@my-ecommerce/db";
import { DEFAULT_LOCALE } from "../locale";

/**
 * Reviews, as the moderation screen reads them.
 *
 * A module of its own rather than a corner of `lib/catalog/reviews-repo.ts`,
 * because the two disagree about almost everything: this one shows every review
 * whatever its status, it needs the product each one is about, and it is the
 * only read in the app that selects the reviewer's email. The storefront's read
 * is the one place that address must never reach, and keeping the two in
 * separate files is what makes that a rule rather than a habit.
 */

/** One review, as the queue draws it. */
export interface AdminReviewSummary {
  id: string;
  /** The product's name in the display locale, or "" for one with no name. */
  productName: string;
  authorName: string;
  authorEmail: string;
  rating: number;
  body: string;
  status: ReviewStatus;
  /** ISO 8601, formatted at the edge like every other date in the contract. */
  createdAt: string;
}

/**
 * Every review, newest first — the decided ones included.
 *
 * Including them is the point: a moderator who approves the wrong row needs to
 * find it again, and a queue that emptied itself on approval would leave the
 * decision final and invisible. The status column is what tells them apart.
 *
 * No `take`, mirroring `listProducts`: this catalogue is small, and paging is a
 * screen of its own the day one is needed. No filtering on `productId` either —
 * the screen is the whole queue.
 */
export async function listReviewsForModeration(): Promise<AdminReviewSummary[]> {
  const rows = await prisma.review.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      rating: true,
      body: true,
      status: true,
      createdAt: true,
      // The two the storefront's read refuses: a moderator has to be able to
      // see who wrote this and to check the address if a review is disputed.
      authorName: true,
      authorEmail: true,
      product: {
        select: {
          id: true,
          translations: {
            where: { locale: DEFAULT_LOCALE },
            select: { name: true },
          },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    // Empty rather than a stand-in for a product with no name in this locale:
    // the row is still real and still needs moderating, and a placeholder would
    // be a word somebody has to learn to ignore.
    productName: row.product.translations.at(0)?.name ?? "",
    authorName: row.authorName,
    authorEmail: row.authorEmail,
    rating: row.rating,
    body: row.body,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));
}

/**
 * Approves or rejects a review.
 *
 * `updateMany` rather than `update`, for the reason `setProductStatus` gives:
 * the id arrives in a form field, and a review deleted in another tab between
 * the page rendering and the click is a no-op rather than an exception. The
 * count is the answer to "did anything happen".
 */
export async function setReviewStatus(
  id: string,
  status: "approved" | "rejected",
): Promise<number> {
  const { count } = await prisma.review.updateMany({
    where: { id },
    data: { status },
  });

  return count;
}
