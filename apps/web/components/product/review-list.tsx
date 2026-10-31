import type { Review } from "@my-ecommerce/shared";
import { formatDate } from "@/lib/format";
import { StarRating } from "@/components/star-rating";
import { fill, plural } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/languages";

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
  messages,
  locale,
}: {
  reviews: readonly Review[];
  productName: string;
  /** This locale's `reviews` slice of the catalog. */
  messages: Messages["reviews"];
  locale: Locale;
}) {
  // "No reviews yet." rather than a heading reading "0 reviews for X": an
  // unreviewed product is a state, not a count of nothing.
  if (reviews.length === 0) {
    return (
      <p className="font-display text-[18px] leading-7 text-ink-55 italic">
        {messages.empty}
      </p>
    );
  }

  return (
    /* One element, not a fragment: this is a column of the section's grid, and
       a fragment's children would each become a grid item of their own — the
       heading in one cell and the list in another. */
    <div>
      <h2 className="font-display text-[26px] leading-9 font-normal [overflow-wrap:anywhere] text-ink">
        {plural(reviews.length, messages.listTitle, { product: productName })}
      </h2>

      <ul className="pt-[20px]">
        {reviews.map((review) => (
          <ReviewItem key={review.id} review={review} messages={messages} locale={locale} />
        ))}
      </ul>
    </div>
  );
}

/**
 * One review, on the design's 40px rhythm: the rule above it, the 40px below
 * that, and the two columns.
 */
function ReviewItem({
  review,
  messages,
  locale,
}: {
  review: Review;
  messages: Messages["reviews"];
  locale: Locale;
}) {
  return (
    <li className="border-t border-line pt-[40px] pb-[40px]">
      <div className="flex gap-[25px]">
        <span aria-hidden className="h-[45px] w-[45px] shrink-0 rounded-full bg-ivory" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-[16px]">
            <p className="flex min-w-0 flex-col gap-1">
              <span className="font-display text-[18px] leading-6 break-words text-ink">
                {review.authorName}
              </span>
              <span className="text-[11px] leading-4 tracking-[0.16em] text-ink-55 uppercase">
                {formatDate(review.createdAt, locale)}
              </span>
            </p>

            {/* A single review's rating, stated as itself: there is no average
                here and no count to read out — the count IS this row. */}
            <StarRating
              rating={{ average: review.rating, count: 1 }}
              messages={messages}
              label={fill(messages.singleRating, { rating: review.rating })}
              className="shrink-0 [&_img]:size-3.5 [&_img]:opacity-80"
            />
          </div>

          <p className="pt-[20px] text-[16px] leading-[28px] whitespace-pre-line break-words text-ink-62">
            {review.body}
          </p>
        </div>
      </div>
    </li>
  );
}
