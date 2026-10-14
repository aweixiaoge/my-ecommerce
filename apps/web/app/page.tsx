import { ProductCard } from "@/components/product-card";
import { getProducts } from "@/lib/mock/catalog";

export default async function HomePage() {
  const products = await getProducts();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="border-b border-neutral-200 py-16 sm:py-24">
        <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Things worth owning.
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-neutral-600">
          A small range, made properly. Free shipping over $150.
        </p>
      </section>

      <section className="py-12 sm:py-16">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium tracking-wide text-neutral-500 uppercase">
            All products
          </h2>
          <span className="text-sm text-neutral-400">
            {products.length} {products.length === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
