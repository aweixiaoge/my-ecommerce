import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import { getNewArrivals } from "@/lib/mock/catalog";

/**
 * The home design's grid is two rows of four, and stays two rows of four —
 * it is a window onto the catalogue, not the catalogue. Everything beyond it
 * is what the Shop page's grid and pager exist for.
 */
const HOME_GRID_SIZE = 8;

export async function NewArrivals() {
  const products = await getNewArrivals(HOME_GRID_SIZE);

  return (
    <section className="pt-[72px] pb-[80px]">
      <div className="container-content">
        <SectionHeading
          title="New arrivals"
          linkLabel="View all products →"
          linkHref="/shop"
        />

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 bar:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
