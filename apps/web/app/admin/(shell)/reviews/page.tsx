import type { Metadata } from "next";
import { connection } from "next/server";
import { setReviewStatusAction } from "./actions";
import { listReviewsForModeration, type AdminReviewSummary } from "@/lib/admin/reviews-repo";
import { formatDate } from "@/lib/format";

/**
 * The review queue.
 *
 * Every review, newest first, with the one decision that matters on each row:
 * a review is visible on its product page only once a moderator has approved
 * it, so this screen is what stands between the form a stranger fills in and
 * the product page.
 *
 * It reads the database at request time, like the product list and for the same
 * reason: a queue showing what was submitted a moment ago is the whole point of
 * it.
 */
export const metadata: Metadata = {
  title: "Review",
};

/**
 * This page is allowed to block — the shell's `instant = false` covers the
 * shell, and validation runs per segment, so a page reading request-time data
 * says so itself. See the product list for the long version.
 */
export const instant = false;

export default async function AdminReviewsPage() {
  // The marker for "prerendering stops here"; the reviews are a database read,
  // so a build-time render would bake the queue as it stood then into the
  // output.
  await connection();

  const reviews = await listReviewsForModeration();
  const pending = reviews.filter((review) => review.status === "pending").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
          Review
        </h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          {reviews.length} {reviews.length === 1 ? "review" : "reviews"},{" "}
          {pending} awaiting moderation.
        </p>
      </div>

      {reviews.length === 0 ? (
        <p className="text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          Nothing has been submitted yet.
        </p>
      ) : (
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Every review in the store, newest first.
          </caption>

          <thead>
            <tr className="border-b border-line">
              <Th>Reviewer</Th>
              <Th>Product</Th>
              <Th>Rating</Th>
              <Th>Review</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>

          <tbody>
            {reviews.map((review) => (
              <tr key={review.id} className="border-b border-line align-top">
                <td className="py-3 pr-4 text-[13px] font-medium text-ink">
                  {review.authorName}
                  {/* The one screen that shows this. A moderator has to be able
                      to see who wrote something — and the storefront's read
                      never selects the column. */}
                  <span className="block text-[12px] leading-[19.8px] text-ink-55">
                    {review.authorEmail}
                  </span>
                </td>
                <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62">
                  {review.productName || "—"}
                </td>
                <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62 tabular-nums">
                  {review.rating} / 5
                </td>
                <td className="max-w-[420px] py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62">
                  <span className="line-clamp-3">{review.body}</span>
                  <span className="block pt-1 text-[12px] text-ink-55">
                    {formatDate(review.createdAt)}
                  </span>
                </td>
                <td className="py-3">
                  <StatusBadge status={review.status} />
                </td>
                <td className="py-3">
                  <RowActions review={review} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-2 pr-4 text-[12px] font-normal tracking-[0.5px] text-ink-55 uppercase">
      {children}
    </th>
  );
}

/**
 * What can be done to a review.
 *
 * Two forms rather than one with two submit buttons, for the reason the product
 * list gives: a form has a single action, and these are two different writes.
 * Neither has a client component above it, so a decision works before React has
 * loaded.
 *
 * The one that does not apply is disabled rather than hidden — the pair stays
 * where the eye left it. Approving is never hidden, though: a moderator who
 * picks the wrong button is the case this screen exists to make reversible, and
 * Reject on an approved review is how they take it back.
 *
 * `aria-label` carries the reviewer's name, because "Approve" repeated down a
 * column says nothing about which row it is in.
 */
function RowActions({ review }: { review: AdminReviewSummary }) {
  return (
    <div className="flex items-center gap-1.5">
      <StatusForm
        id={review.id}
        status="approved"
        disabled={review.status === "approved"}
        label={`Approve ${review.authorName}'s review`}
      >
        Approve
      </StatusForm>
      <StatusForm
        id={review.id}
        status="rejected"
        disabled={review.status === "rejected"}
        label={`Reject ${review.authorName}'s review`}
      >
        Reject
      </StatusForm>
    </div>
  );
}

function StatusForm({
  id,
  status,
  disabled,
  label,
  children,
}: {
  id: string;
  status: "approved" | "rejected";
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <form action={setReviewStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        disabled={disabled}
        aria-label={label}
        className="h-7 rounded-control border border-line px-2 text-[12px] leading-[19.8px] text-ink transition-colors hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        {children}
      </button>
    </form>
  );
}

/**
 * Approved is not a styling variant of the other two: it is the one state that
 * puts a stranger's words on a product page. The difference gets a shape as
 * well as a colour, so it reads the same to someone who cannot tell the greys
 * apart — and pending and rejected share the quiet one, because the word beside
 * it is what tells them apart.
 */
function StatusBadge({ status }: { status: AdminReviewSummary["status"] }) {
  const className =
    status === "approved"
      ? "rounded-control border border-line px-2 py-0.5 text-[12px] leading-[19.8px] text-ink"
      : "rounded-control bg-mist px-2 py-0.5 text-[12px] leading-[19.8px] text-ink-62";

  return <span className={className}>{status}</span>;
}
