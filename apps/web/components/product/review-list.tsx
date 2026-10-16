import type { Review } from "@my-ecommerce/shared";
import { formatDate } from "@/lib/format";
import { StarRating } from "@/components/star-rating";

/**
 * The design's review list (Figma 178:3099): a count, then one bordered entry
 * per review — a 45px avatar column on the left of a row that carries the
 * author, the date and the stars, with the review itself underneath.
 *
 * The reviews arrive approved-only, because the query that read them says so;
 * nothing here decides who may see what.
 *
 * Two substitutions the design leaves open, both flagged rather than silent:
 *
 *   * the avatar is a photographic slot the design draws empty and guest
 *     reviews carry no picture for, so the circle is a plain one. It keeps the
 *     45px column (and the 70px the text starts at) that the design's rows are
 *     built on.
 *   * the body is rendered as plain text, never as markdown. `parseMarkdown`
 *     produces React elements rather than HTML, so there is no injection to
 *     worry about — but honouring a stranger's formatting on a product page is
 *     not something the design asks for, and `whitespace-pre-line` keeps the
 *     line breaks they actually typed.
 */
export function ReviewList({
  reviews,
  productName,
}: {
  reviews: readonly Review[];
  productName: string;
}) {
  // "No reviews yet." rather than a heading reading "0 reviews for X": an
  // unreviewed product is a state, not a count of nothing.
  if (reviews.length === 0) {
    return (
      <p className="text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink-60">
        No reviews yet.
      </p>
    );
  }

  return (
    /* One element, not a fragment: this is a column of the section's grid, and
       a fragment's children would each become a grid item of their own — the
       heading in one cell and the list in another. */
    <div>
      <h2 className="text-[16px] leading-[24px] font-bold tracking-[-0.3125px] text-ink">
        {reviews.length} {reviews.length === 1 ? "review" : "reviews"} for{" "}
        {productName}
      </h2>

      <ul className="pt-[20px]">
        {reviews.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </ul>
    </div>
  );
}

/**
 * One review, on the design's 40px rhythm: the rule above it, the 40px below
 * that, and the two columns.
 */
function ReviewItem({ review }: { review: Review }) {
  return (
    <li className="border-t border-line pt-[40px] pb-[40px]">
      <div className="flex gap-[25px]">
        <span aria-hidden className="h-[45px] w-[45px] shrink-0 rounded-full bg-mist" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-[16px]">
            <p className="text-[16px] leading-[20px] font-bold tracking-[-0.3125px] text-ink">
              {review.authorName}
              <span className="pl-[7.7px] text-[13px] leading-[20px] font-medium tracking-[-0.076px] uppercase">
                – {formatDate(review.createdAt)}
              </span>
            </p>

            {/* A single review's rating, stated as itself: there is no average
                here and no count to read out — the count IS this row. */}
            <StarRating
              rating={{ average: review.rating, count: 1 }}
              label={`Rated ${review.rating} out of 5`}
              className="shrink-0"
            />
          </div>

          <p className="pt-[24px] text-[16px] leading-[26.4px] tracking-[-0.3125px] whitespace-pre-line break-words text-ink">
            {review.body}
          </p>
        </div>
      </div>
    </li>
  );
}
