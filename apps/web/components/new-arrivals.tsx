import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import { getProducts } from "@/lib/mock/catalog";

export async function NewArrivals() {
  const products = await getProducts();

  return (
    <section className="pt-[72px] pb-[80px]">
      <div className="container-content">
        <SectionHeading
          title="New arrivals"
          linkLabel="View all products →"
          linkHref="/shop"
        />

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
