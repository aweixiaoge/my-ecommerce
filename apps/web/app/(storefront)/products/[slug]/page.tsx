import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getProductSlugs } from "@/lib/mock/catalog";
import { formatMoney } from "@/lib/format";

export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? product.shortDescription ?? undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const onSale =
    product.compareAtPrice !== null &&
    product.compareAtPrice.amount !== product.price.amount;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-8 text-sm text-neutral-500">
        <Link href="/" className="hover:text-neutral-900">
          Home
        </Link>
        {product.categories[0] && (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/categories/${product.categories[0].slug}`}
              className="hover:text-neutral-900"
            >
              {product.categories[0].name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="aspect-square overflow-hidden rounded-xl bg-neutral-100">
          <div className="flex h-full w-full items-center justify-center p-8 text-center text-sm font-medium tracking-wide text-neutral-400 uppercase">
            {product.name}
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {product.name}
          </h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-xl">{formatMoney(product.price)}</span>
            {onSale && product.compareAtPrice && (
              <span className="text-base text-neutral-400 line-through">
                {formatMoney(product.compareAtPrice)}
              </span>
            )}
          </div>

          {product.shortDescription && (
            <p className="mt-6 text-sm leading-relaxed text-neutral-600">
              {product.shortDescription}
            </p>
          )}

          {product.options.map((option) => (
            <div key={option.id} className="mt-8">
              <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
                {option.name}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {option.values.map((value) => {
                  const variant = product.variants.find((v) =>
                    v.optionValues.some((ov) => ov.id === value.id),
                  );
                  const soldOut = variant ? !variant.inStock : true;

                  return (
                    <span
                      key={value.id}
                      className={`rounded-md border px-3 py-1.5 text-sm ${
                        soldOut
                          ? "border-neutral-200 text-neutral-300 line-through"
                          : "border-neutral-300 text-neutral-900"
                      }`}
                    >
                      {value.name}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            type="button"
            disabled={!product.inStock}
            className="mt-10 w-full rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
          >
            {product.inStock ? "Add to cart" : "Out of stock"}
          </button>

          <p className="mt-3 text-center text-xs text-neutral-400">
            Cart is wired up in Phase 2.
          </p>

          <div className="mt-10 border-t border-neutral-200 pt-8">
            <h2 className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
              Details
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              {product.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
