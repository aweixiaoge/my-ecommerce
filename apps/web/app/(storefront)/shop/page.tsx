import { Suspense } from "react";
import type { Metadata } from "next";
import { ShopBanner } from "@/components/shop-banner";
import { ShopPagination } from "@/components/shop-pagination";
import { ShopProductCard } from "@/components/shop-product-card";
import { ShopToolbar } from "@/components/shop-toolbar";
import { getShopProducts } from "@/lib/catalog/products-repo";
import { parseShopQuery } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Every earbud, earphone and headphone we stock — hand-tested by our own team before it reaches your cart.",
};

type ShopSearchParams = Awaited<PageProps<"/shop">["searchParams"]>;

const PRODUCT_CARD_HEIGHT = "h-[425.186px]";

/**
 * The Shop listing (Figma node 178:8286).
 *
 * Page state lives in the URL, not in component state: `?page=` and `?sort=`
 * are read on the server and handed to `getShopProducts`, the way the API will
 * be called. That makes a sorted page two shareable, bookmarkable and
 * crawlable — and it is why the sort control is a GET form, not a `useState`.
 *
 * Reading `searchParams` is runtime data, so it cannot be part of the
 * prerendered shell: with Cache Components enabled this route fails to build
 * unless the read happens inside `<Suspense>`. The split is deliberate — the
 * banner and page furniture are static and ship immediately, and only the
 * results stream.
 */
export default function ShopPage(props: PageProps<"/shop">) {
  return (
    <section className="pt-[60px] pb-[29px]">
      <div className="container-content">
        <ShopBanner />

        <Suspense fallback={<ShopResultsFallback />}>
          {props.searchParams.then((searchParams) => (
            <ShopResults searchParams={searchParams} />
          ))}
        </Suspense>
      </div>
    </section>
  );
}

async function ShopResults({ searchParams }: { searchParams: ShopSearchParams }) {
  const query = parseShopQuery(searchParams);
  const { items, pagination } = await getShopProducts(query);

  return (
    <>
      <ShopToolbar pagination={pagination} sort={query.sort} action="/shop" />

      {/*
        The design's List:margin — 25px above the grid — and its four columns
        from `bar`, which is where the rest of the storefront decides a window
        is a desktop one. See `--breakpoint-bar` in globals.css.
      */}
      <div className="grid grid-cols-1 gap-[30px] pt-[25px] sm:grid-cols-2 bar:grid-cols-4">
        {items.map((product, index) => (
          <ShopProductCard key={product.id} product={product} eager={index === 0} />
        ))}
      </div>

      <ShopPagination pagination={pagination} sort={query.sort} path="/shop" />
    </>
  );
}

/**
 * Reserves the exact height of the results it stands in for — the toolbar row,
 * the grid, and the pager — so nothing below the fold moves when the real
 * content streams in.
 */
function ShopResultsFallback() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="flex items-center justify-between gap-[13px] pt-10">
        <div className="h-[21.45px] w-[209px] bg-mist" />
        <div className="h-10 w-[202.727px] rounded-[3px] border-[0.909px] border-line" />
      </div>

      <div className="grid grid-cols-1 gap-[30px] pt-[25px] sm:grid-cols-2 bar:grid-cols-4">
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} className={`${PRODUCT_CARD_HEIGHT} rounded-[3px] bg-mist`} />
        ))}
      </div>

      <div className="h-[100px]" />
    </div>
  );
}
