import Image from "next/image";
import Link from "next/link";
import type { ProductSummary } from "@my-ecommerce/shared";
import { formatMoney } from "@/lib/format";

export function ProductCard({ product }: { product: ProductSummary }) {
  const onSale =
    product.compareAtPrice !== null &&
    product.compareAtPrice.amount !== product.price.amount;

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt ?? product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-6 text-center text-xs font-medium tracking-wide text-neutral-400 uppercase">
            {product.name}
          </div>
        )}

        {!product.inStock && (
          <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-neutral-700">
            Out of stock
          </span>
        )}
        {onSale && product.inStock && (
          <span className="absolute top-3 left-3 rounded-full bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-white">
            Sale
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="text-sm font-medium text-neutral-900">{product.name}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-neutral-900">
            {formatMoney(product.price)}
          </span>
          {onSale && product.compareAtPrice && (
            <span className="text-xs text-neutral-400 line-through">
              {formatMoney(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
