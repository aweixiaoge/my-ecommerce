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
 * Restyled away from the comp toward a quieter, luxury register: centred, the
 * category as a gold eyebrow over a serif title, a short gold rule, a light
 * tracked price, small stars, and an outlined button that fills on hover. The
 * content and its order of importance are the design's; only the dress is not.
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
    <article className="group/card flex min-w-0 flex-col text-center">
      {/*
        Sharp corners, an ivory ground and a hairline that only firms up on
        hover: the image is the product, so the frame stays quiet. The zoom is
        slow and slight on purpose — a fast, large one reads as a sale banner.
      */}
      <Link href={href} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-ivory ring-1 ring-ink/[0.04] transition-shadow duration-500 ring-inset group-hover/card:ring-ink/10">
          {product.image ? (
            <Image
              src={product.image.url}
              alt={product.image.alt ?? product.name}
              fill
              sizes="(min-width: 768px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-[900ms] ease-out group-hover/card:scale-[1.04]"
              loading={eager ? "eager" : "lazy"}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-6 text-center font-display text-sm text-ink-55 italic">
              {product.name}
            </div>
          )}
        </div>
      </Link>

      {/* The category leads, as an eyebrow, rather than trailing the price. */}
      {product.categories[0] && (
        <p className="mt-6 text-[11px] leading-4 font-medium tracking-[0.22em] text-gold uppercase">
          {product.categories[0].name}
        </p>
      )}

      <h3 className="mt-2 font-display text-[19px] leading-[26px] font-normal [overflow-wrap:anywhere] text-ink">
        <Link
          href={href}
          className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0_1px] bg-bottom bg-no-repeat transition-[background-size] duration-500 group-hover/card:bg-[length:100%_1px]"
        >
          {product.name}
        </Link>
      </h3>

      <div aria-hidden className="mx-auto mt-3 h-px w-8 bg-gold/50" />

      <p className="mt-3 text-[14px] leading-[22px] font-normal tracking-[0.06em] text-ink-60 tabular-nums">
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
        className="mt-2 justify-center gap-1 [&_img]:size-3 [&_img]:opacity-80"
      />

      {/*
        `mt-auto` absorbs the slack a wrapped title leaves, so a row of buttons
        stays on one line; the padding keeps a gap when there is none.
      */}
      <div className="mt-auto pt-5">
        <AddToCartButton
          target={{ productId: product.id }}
          label={product.inStock ? messages.listing.addToCart : messages.cart.add.soldOut}
          disabled={!product.inStock}
          messages={messages.cart.add}
          cartHref={localePath(locale, "/cart")}
          placement="card"
          className="inline-flex h-10 w-full items-center justify-center border border-ink bg-transparent px-5 text-[13px] leading-5 font-medium tracking-[0.14em] text-ink transition-colors duration-300 hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:border-ink/30 disabled:text-ink-55 disabled:hover:bg-transparent"
        />
      </div>
    </article>
  );
}
