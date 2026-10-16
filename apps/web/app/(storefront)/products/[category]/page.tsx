import { Suspense } from "react";
import type { Metadata } from "next";
import {
  ProductPage,
  loadProduct,
  parseTab,
  productMetadata,
} from "../product-page";
import { ShopPagination } from "@/components/shop-pagination";
import { ShopProductCard } from "@/components/shop-product-card";
import { ShopToolbar } from "@/components/shop-toolbar";
import { getCategoryBySlug, type CategoryDetail } from "@/lib/catalog/category-repo";
import { categoryPath } from "@/lib/catalog/product-path";
import { getShopProducts } from "@/lib/catalog/products-repo";
import { parseShopQuery } from "@/lib/shop";

/**
 * One segment below `/products` — and it means two things.
 *
 * * A category's page: `/products/earbuds` lists what is filed in Earbuds. It
 *   is the address the breadcrumb and the buy box point at, and the address a
 *   product's own URL is nested under.
 * * A product's old address: `/products/<product-slug>` is where products lived
 *   before categories were in the URL, and it is still the only address a
 *   product filed in no category has. `ProductPage` sends the first kind on to
 *   `/products/<category>/<slug>` and renders the second.
 *
 * A category wins when a slug answers to both. Both tables keep their slugs
 * unique per locale, so only a deliberate collision reaches that rule.
 *
 * Both meanings are resolved here rather than in two routes because Next
 * forbids two differently-named dynamic segments at one level: `[category]` and
 * `[slug]` cannot be siblings, and `[category]/[slug]` already spends the
 * segment a second `[slug]` would need.
 */
type ProductsSearchParams = Awaited<
  PageProps<"/products/[category]">["searchParams"]
>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;

  const found = await getCategoryBySlug(category);
  if (found) {
    // Empty rather than absent: a category with no copy of its own has no
    // description, which is not the same as one whose description is "".
    return { title: found.name, description: found.description || undefined };
  }

  // Not a category: a product, or nothing at all — `productMetadata` answers
  // `{}` for the second and 404s are Next's own.
  return productMetadata(await loadProduct(category));
}

export default function ProductsSegmentPage(
  props: PageProps<"/products/[category]">,
) {
  return (
    <Suspense fallback={<SegmentFallback />}>
      {Promise.all([props.params, props.searchParams]).then(
        ([params, searchParams]) => (
          <Segment segment={params.category} searchParams={searchParams} />
        ),
      )}
    </Suspense>
  );
}

/**
 * Which of the two things this address is, and then that thing.
 *
 * The category lookup runs first and is the only query on the ordinary path; a
 * product lookup happens only when nothing answers to the slug as a category,
 * which is the legacy-address case and nothing else.
 */
async function Segment({
  segment,
  searchParams,
}: {
  segment: string;
  searchParams: ProductsSearchParams;
}) {
  const category = await getCategoryBySlug(segment);

  if (category) {
    return <CategoryListing category={category} searchParams={searchParams} />;
  }

  return (
    <section className="container-content pt-[30px] pb-[50px]">
      <ProductPage
        requestedPath={`/products/${segment}`}
        slug={segment}
        tab={parseTab(searchParams.tab)}
      />
    </section>
  );
}

/**
 * A category's products.
 *
 * The shop's listing, narrowed: the same cards, the same count line and sort
 * control, the same pager, and the same `?page=`/`?sort=` rules — all of them
 * pointed at this category's own address by the `path` prop. A category page
 * built from its own pieces would be a second grid to keep in step with the
 * first, which is the thing `getShopProducts` exists to prevent on the data
 * side.
 *
 * The heading is the design's `Shop` heading (node 178:8357, 30px) with the
 * category's name in it. There is no frame for this page in the Figma file —
 * the storefront designs are Home, Shop and Product Detail — so the block is
 * the shop's, less the banner it has no artwork for.
 */
async function CategoryListing({
  category,
  searchParams,
}: {
  category: CategoryDetail;
  searchParams: ProductsSearchParams;
}) {
  const query = parseShopQuery(searchParams);
  const { items, pagination } = await getShopProducts({
    ...query,
    categoryId: category.id,
  });

  const path = categoryPath(category);

  return (
    <section className="pt-[60px] pb-[29px]">
      <div className="container-content">
        <h1 className="text-[30px] leading-[45px] font-bold tracking-[0.3955px] text-ink">
          {category.name}
        </h1>

        {category.description && (
          <p className="max-w-[790px] pt-[10px] text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink-60">
            {category.description}
          </p>
        )}

        {items.length === 0 ? (
          /* No toolbar over an empty grid: "No results" and a sort control
             above nothing is a page that looks broken rather than empty. */
          <p className="pt-[40px] text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink-60">
            Nothing is filed in this category yet.
          </p>
        ) : (
          <>
            <ShopToolbar pagination={pagination} sort={query.sort} action={path} />

            <div className="grid grid-cols-1 gap-[30px] pt-[25px] sm:grid-cols-2 bar:grid-cols-4">
              {items.map((product, index) => (
                <ShopProductCard
                  key={product.id}
                  product={product}
                  eager={index === 0}
                />
              ))}
            </div>

            <ShopPagination
              pagination={pagination}
              sort={query.sort}
              path={path}
            />
          </>
        )}
      </div>
    </section>
  );
}

/**
 * What stands in for whichever of the two things this address is.
 *
 * A neutral skeleton rather than the product page's or the listing's: which one
 * to draw is exactly what the database is being asked, so the only honest
 * answer while it answers is a block where the content will be.
 */
function SegmentFallback() {
  return (
    <section className="pt-[60px] pb-[29px]">
      <div className="container-content" aria-hidden>
        <div className="h-[45px] w-[280px] animate-pulse bg-mist" />
        <div className="grid grid-cols-1 gap-[30px] pt-[45px] sm:grid-cols-2 bar:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-[425.186px] animate-pulse rounded-[3px] bg-mist"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
