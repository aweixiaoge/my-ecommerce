import Image from "next/image";
import type { ProductRating } from "@my-ecommerce/shared";

const STARS = [0, 1, 2, 3, 4];

/**
 * The design's "Five Star Rating" (node 178:9189): five 24×23 stars on a 6px
 * gap, filled in the accent orange and unfilled in its pale tint.
 *
 * The average is rounded to whole stars because the design only draws whole
 * ones — there is no half-star layer to use. The exact figure and the review
 * count go to assistive tech, which is where a shopper can actually use them;
 * a screen reader announcing "four filled stars" five times is worse than one
 * sentence.
 *
 * That sentence is a product's, though — "Rated 4 out of 5 from 12 reviews" —
 * and a row of a *single* review has no count to state, so `label` replaces it
 * where the figure is not an average. Left out, the sentence above is unchanged.
 */
export function StarRating({
  rating,
  className,
  label,
}: {
  rating: ProductRating | null;
  className?: string;
  label?: string;
}) {
  // No reviews is not zero stars. Rendering an empty row would read as a
  // one-out-of-five verdict on a product nobody has rated yet.
  if (!rating) return null;

  const filled = Math.round(rating.average);

  return (
    <div
      className={`flex items-center gap-1.5 ${className ?? ""}`}
      role="img"
      aria-label={
        label ?? `Rated ${rating.average} out of 5 from ${rating.count} reviews`
      }
    >
      {STARS.map((star) => (
        <Image
          key={star}
          src={star < filled ? "/icons/star-filled.svg" : "/icons/star-empty.svg"}
          alt=""
          width={24}
          height={23}
        />
      ))}
    </div>
  );
}
