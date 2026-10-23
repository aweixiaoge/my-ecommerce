import Image from "next/image";
import Link from "next/link";
import type { ProductSummary } from "@my-ecommerce/shared";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { StarRating } from "@/components/star-rating";
import { productPath } from "@/lib/catalog/product-path";
import type { DisplayCurrency } from "@/lib/currency/display";
import { formatPrice } from "@/lib/format";
import { localePath } from "@/lib/i18n/paths";
import type { Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/languages";

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
 * The button adds to the cart from here, as its label says. The design's layer
 * name reads "Link - Select options for ...", which is what a card does when a
 * shopper must choose first; this one does not ask, and adds the variant its
 * price is for — the cheapest in stock, the same one the product page opens
 * on (`defaultVariant`). A shopper who wants another colour is one tap away
 * from it on the image or the title, and the cart names the variant it holds.
 */
export function ShopProductCard({
  product,
  eager = false,
  locale,
  currency,
  messages,
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
  locale: Locale;
  /** The currency the price is written in — the reader's, not the row's. */
  currency: DisplayCurrency;
  /**
   * This locale's catalog.
   *
   * The whole of it rather than the two slices this card reads, because a
   * catalog handed from one Server Component to another is not serialized —
   * it is an argument — and the card's three parents already hold one. A
   * *client* component is the case that takes a slice; see `site-header.tsx`.
   */
  messages: Messages;
}) {
  const hasRange =
    product.priceMax !== null && product.priceMax.amount !== product.price.amount;
  // One builder for every product link in the app — see `productPath`.
  const href = productPath(product, locale);

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
            {formatPrice(product.price, currency, locale)}
            {" – "}
            {formatPrice(product.priceMax, currency, locale)}
          </>
        ) : (
          formatPrice(product.price, currency, locale)
        )}
      </p>

      <StarRating
        rating={product.rating}
        messages={messages.reviews}
        className="mt-[11px]"
      />

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
        <AddToCartButton
          target={{ productId: product.id }}
          label={product.inStock ? messages.listing.addToCart : messages.cart.add.soldOut}
          disabled={!product.inStock}
          messages={messages.cart.add}
          cartHref={localePath(locale, "/cart")}
          placement="card"
          className="inline-flex h-10 items-center justify-center rounded-[3px] bg-ink px-5 text-[15px] leading-[24.75px] font-medium tracking-[-0.2344px] text-paper disabled:cursor-not-allowed disabled:opacity-40"
        />
      </div>
    </article>
  );
}
