import Image from "next/image";
import Link from "next/link";
import type { ProductSummary } from "@my-ecommerce/shared";
import { formatMoney } from "@/lib/format";

/**
 * Matches the design's `Product Card:Home` component (node 178:10359):
 * 4:3 image at 3px radius, 12px gap, bold title, 13px price. The design shows
 * no sale or stock badge, so neither is rendered here — see the note in
 * docs/plan.md about the missing out-of-stock affordance.
 */
export function ProductCard({ product }: { product: ProductSummary }) {
  const hasRange =
    product.priceMax !== null && product.priceMax.amount !== product.price.amount;

  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col pb-6">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-mist">
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt ?? product.name}
            fill
            sizes="(min-width: 768px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-6 text-center text-xs font-medium tracking-wide text-ink-55 uppercase">
            {product.name}
          </div>
        )}
      </div>

      <h3 className="mt-3 text-[20px] leading-[30px] font-bold tracking-[-0.449px] text-ink">
        {product.name}
      </h3>

      <p className="text-[13px] leading-[21.45px] tracking-[-0.076px] text-ink">
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
    </Link>
  );
}
