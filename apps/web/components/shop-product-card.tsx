import Image from "next/image";
import Link from "next/link";
import type { ProductSummary } from "@my-ecommerce/shared";
import { StarRating } from "@/components/star-rating";
import { productPath } from "@/lib/catalog/product-path";
import { formatMoney } from "@/lib/format";

/**
 * The design's `Product Card:Shop` (node 178:9202) — the home card's sibling
 * with three extra rows: a star rating, the category, and a call to action.
 *
 * Geometry from the component's own layout objects, 300 wide and 425.186 tall:
 * a 4:3 image at 3px radius, 25px, a 17/25.5 bold title, 9.5px, the 15/24.75
 * price, 11px, the 23px star row, 10.5px, the uppercase 13px category, 9.5px,
 * and the 40px button. The gaps are the design's own paddings, not eyeballed
 * from the raster.
 *
 * There is no cart to add to yet, so the button routes to the product page
 * where a size is chosen — which is what the design's own layer name says it
 * does ("Link - Select options for ...") even though the label reads "Add to
 * Cart". See the note in the handover.
 */
export function ShopProductCard({
  product,
  eager = false,
}: {
  product: ProductSummary;
  /**
   * Set on the first card only. On a phone the grid's first image is the
   * largest thing above the fold, so it is the LCP element and lazy-loading it
   * makes the page look slower than it is.
   *
   * Named for what it does to the `loading` attribute rather than
   * `priority`, which was Next's own prop until it was deprecated in 16 and
   * would now read as a reference to it.
   */
  eager?: boolean;
}) {
  const hasRange =
    product.priceMax !== null && product.priceMax.amount !== product.price.amount;
  // One builder for every product link in the app — see `productPath`.
  const href = productPath(product);

  return (
    <article className="flex flex-col">
      <Link href={href} className="group block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-mist">
          {product.image ? (
            <Image
              src={product.image.url}
              alt={product.image.alt ?? product.name}
              fill
              sizes="(min-width: 768px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              loading={eager ? "eager" : "lazy"}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-6 text-center text-xs font-medium tracking-wide text-ink-55 uppercase">
              {product.name}
            </div>
          )}
        </div>
      </Link>

      <h3 className="mt-[25px] text-[17px] leading-[25.5px] font-semibold tracking-[-0.4316px] text-ink">
        <Link href={href}>{product.name}</Link>
      </h3>

      <p className="mt-[9.5px] text-[15px] leading-[24.75px] font-semibold tracking-[-0.2344px] text-ink">
        {hasRange && product.priceMax ? (
          <>
            {formatMoney(product.price)}
            {" – "}
            {formatMoney(product.priceMax)}
          </>
        ) : (
          formatMoney(product.price)
        )}
      </p>

      <StarRating rating={product.rating} className="mt-[11px]" />

      {product.categories[0] && (
        <p className="mt-[10.5px] text-[13px] leading-[21.45px] font-semibold tracking-[-0.0762px] text-ink uppercase">
          {product.categories[0].name}
        </p>
      )}

      {/*
        The 9.5px is padding, not a margin, so it is always there: `mt-auto`
        absorbs any slack but collapses to nothing when there is none. At the
        design's 300px column every title fits on one line and the slack is
        zero, which is the design exactly. Narrower, a long name wraps and the
        cards in a row grow unevenly — the auto margin takes that up, so a row
        of buttons stays on one line instead of stepping with the longest title.
      */}
      <div className="mt-auto pt-[9.5px]">
        <Link
          href={href}
          className="inline-flex h-10 items-center justify-center rounded-[3px] bg-ink px-5 text-[15px] leading-[24.75px] font-medium tracking-[-0.2344px] text-paper"
        >
          Add to Cart
        </Link>
      </div>
    </article>
  );
}
