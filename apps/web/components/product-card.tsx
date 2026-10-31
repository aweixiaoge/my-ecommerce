import Image from "next/image";
import Link from "next/link";
import type { ProductSummary } from "@my-ecommerce/shared";
import { productPath } from "@/lib/catalog/product-path";
import type { DisplayCurrency } from "@/lib/currency/display";
import { formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/languages";

/**
 * Matches the design's `Product Card:Home` component (node 178:10359):
 * 4:3 image at 3px radius, 12px gap, bold title, 13px price. The design shows
 * no sale or stock badge, so neither is rendered here — see the note in
 * docs/plan.md about the missing out-of-stock affordance.
 *
 * Nothing here is copy, which is why the card takes a locale and not a
 * catalog: the name and the price are the row's. The two things the reader
 * brings are the language the price is written in and the currency it is
 * converted to — `79,00 $` under `/de`, and `€72.68` for a reader who chose
 * euros — which is why `formatPrice` and not `formatMoney` draws it.
 */
export function ProductCard({
  product,
  locale,
  currency,
}: {
  product: ProductSummary;
  locale: Locale;
  /** The currency prices are written in — see `lib/currency/display.ts`. */
  currency: DisplayCurrency;
}) {
  const hasRange =
    product.priceMax !== null && product.priceMax.amount !== product.price.amount;

  return (
    <Link href={productPath(product, locale)} className="group flex min-w-0 flex-col text-center">
      <div className="relative aspect-[4/3] overflow-hidden bg-ivory">
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt ?? product.name}
            fill
            sizes="(min-width: 768px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-6 text-center font-display text-sm text-ink-55 italic">
            {product.name}
          </div>
        )}
      </div>

      <h3 className="mt-5 font-display text-[19px] leading-[26px] font-normal [overflow-wrap:anywhere] text-ink">
        <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0_1px] bg-bottom bg-no-repeat transition-[background-size] duration-500 group-hover:bg-[length:100%_1px]">
          {product.name}
        </span>
      </h3>

      <p className="mt-2 text-[14px] leading-[22px] tracking-[0.06em] text-ink-60 tabular-nums">
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
    </Link>
  );
}
