import type { Review } from "@my-ecommerce/shared";
import type { Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/languages";
import { ReviewForm } from "./review-form";
import { ReviewList } from "./review-list";

/**
 * The design's review section (Figma 178:3098): the reviews on the left, the
 * form that adds one on the right, in two equal columns across the page.
 *
 * The design's columns are 47.5% each with the remaining 5% as the gutter —
 * 612.75px and 64.5px inside the 1290 the content column gives — which is what
 * `gap-[64px]` reproduces to within half a pixel. Below `bar` the two stack,
 * because a 600px-wide review list beside a 600px-wide form is not a layout
 * anyone can read at 768.
 *
 * The form is a Client Component and the list is not, which is the split the
 * two actually have: one holds typing, the other draws what the database said.
 */
export function ProductReviews({
  reviews,
  productId,
  productName,
  messages,
  locale,
}: {
  reviews: readonly Review[];
  productId: string;
  productName: string;
  /** This locale's `reviews` slice of the catalog. */
  messages: Messages["reviews"];
  locale: Locale;
}) {
  return (
    <div className="grid grid-cols-1 gap-[64px] bar:grid-cols-2">
      <ReviewList
        reviews={reviews}
        productName={productName}
        messages={messages}
        locale={locale}
      />
      <ReviewForm
        productId={productId}
        messages={messages.form}
        locale={locale}
      />
    </div>
  );
}
