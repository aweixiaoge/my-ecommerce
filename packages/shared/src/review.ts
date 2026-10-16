import { z } from "zod";

/**
 * Reviews: what a shopper wrote, and what the product page draws.
 *
 * The split is the one `catalog.ts` keeps — `ReviewSchema` is RESOLVED content a
 * screen renders, `ReviewCreateSchema` is what a form sends back — with one
 * difference that comes from plan.md: reviews are user content and are NOT
 * translated. There is no `review_translations` table behind any of this, and
 * the `locale` on a review row is the language it was *written in*, not a
 * language it is available in. Nothing here is a map of languages.
 */

/** The star scale the design draws: one to five, and nothing in between. */
export const RATING_MIN = 1;
export const RATING_MAX = 5;

/**
 * Bounds, not policy — sized the way `admin-product.ts`'s are: far above
 * anything a person types, and well under anything that makes a request
 * expensive to handle.
 *
 * Exported because two layers enforce them and they must agree. The form puts
 * `maxLength` on each box so a person is stopped before the round trip; the
 * action checks again, because a Server Action is reachable by direct POST and
 * the browser's check is feedback rather than enforcement. Two copies of the
 * number would drift; one definition cannot.
 */
export const REVIEW_AUTHOR_NAME_MAX = 80;
/** plan.md's `customers.email` ceiling, for the row this eventually backfills into. */
export const REVIEW_AUTHOR_EMAIL_MAX = 200;
/** Prose, not markdown: the design's textarea is 170px tall, and nobody writes a page. */
export const REVIEW_BODY_MAX = 4_000;

/**
 * One review, as the product page renders it.
 *
 * No `status`: the only reviews a shopper is ever sent are the approved ones,
 * and a client that had to check a status would be a client that could be
 * talked into showing the others. No `locale`, either — the review list shows
 * every approved review whatever language it was written in, so nothing reads
 * the column. And no `authorEmail`: the address exists so a moderator can see
 * who wrote something, and the read that builds this never selects it.
 */
export const ReviewSchema = z.object({
  id: z.string(),
  rating: z.number().int().min(RATING_MIN).max(RATING_MAX),
  authorName: z.string(),
  body: z.string(),
  /**
   * ISO 8601, checked rather than `z.string()`. A date crosses the wire as a
   * string — `ProductForEdit.updatedAt` does the same — and this is what fails
   * loudly if a mapper ever hands over a raw `Date` instead of calling
   * `toISOString()` on it.
   */
  createdAt: z.iso.datetime(),
});

export type Review = z.infer<typeof ReviewSchema>;

/**
 * What the storefront's form submits.
 *
 * No `status` and no `locale`, both deliberately: anything the client could set
 * is something a user could tamper with. The language is a decision about the
 * page being read, and the status is a moderator's — a payload that carried
 * `status` would be a payload that could approve itself.
 *
 * `rating` is coerced rather than a plain number because every field arrives
 * from a `FormData` as a string. Coercing here means the action hands the form
 * straight to `safeParse`, and an empty or missing rating becomes a refusal
 * from one schema instead of a silent `0` from a `Number()` somewhere else.
 *
 * The email is trimmed and lowercased before it is checked, which is what
 * plan.md's `customers.email` being `citext` will mean later: the join from a
 * review to an account becomes a comparison rather than a normalisation.
 */
export const ReviewCreateSchema = z.object({
  productId: z.string().min(1).max(64),
  authorName: z.string().trim().min(1).max(REVIEW_AUTHOR_NAME_MAX),
  authorEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(REVIEW_AUTHOR_EMAIL_MAX)
    .pipe(z.email()),
  rating: z.coerce.number().int().min(RATING_MIN).max(RATING_MAX),
  body: z.string().trim().min(1).max(REVIEW_BODY_MAX),
});

export type ReviewCreate = z.infer<typeof ReviewCreateSchema>;

/**
 * Approving or rejecting, from the moderation list.
 *
 * The two decisions the buttons mean, and only those. `pending` is deliberately
 * not accepted, for the reason `AdminProductPublishSchema` excludes `archived`:
 * an "un-moderate" is a third flow with no screen behind it, and a crafted POST
 * that could push an approved review back into the queue would make a
 * moderator's decision quietly reversible by whoever sent the request.
 */
export const AdminReviewModerateSchema = z.object({
  id: z.string().min(1).max(64),
  status: z.enum(["approved", "rejected"]),
});

export type AdminReviewModerate = z.infer<typeof AdminReviewModerateSchema>;
