import { Suspense } from "react";
import type { Metadata } from "next";
import { ShopBanner } from "@/components/shop-banner";
import { ShopPagination } from "@/components/shop-pagination";
import { ShopProductCard } from "@/components/shop-product-card";
import { ShopToolbar } from "@/components/shop-toolbar";
import { getShopProducts } from "@/lib/catalog/products-repo";
import { requestDisplayCurrency } from "@/lib/currency/request";
import { getMessages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import { requestLocale } from "@/lib/i18n/request";
import { parseShopQuery } from "@/lib/shop";

/**
 * The listing's own title and description, in the language of the address.
 *
 * `generateMetadata` rather than a static export, because the two strings are
 * copy: the shop page under `/de` describes itself in German, and both come
 * from the same catalog the page's own text does.
 */
export async function generateMetadata(): Promise<Metadata> {
  const messages = getMessages(await requestLocale());

  return { title: messages.shop.title, description: messages.shop.description };
}

type ShopSearchParams = Awaited<PageProps<"/[lang]/shop">["searchParams"]>;

/** The restyled card with a one-line title, measured at the 1290 column. */
const PRODUCT_CARD_HEIGHT = "h-[418px]";

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
export default async function ShopPage(props: PageProps<"/[lang]/shop">) {
  const locale = await requestLocale();

  return (
    <section className="pt-[72px] pb-[60px]">
      <div className="container-content">
        <ShopBanner messages={getMessages(locale).shop} locale={locale} />

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
  const locale = await requestLocale();
  const messages = getMessages(locale);
  const query = parseShopQuery(searchParams);
  const { items, pagination } = await getShopProducts(query, locale);
  const path = localePath(locale, "/shop");
  // Read inside this section rather than in the page above it: a cookie read
  // outside a `<Suspense>` boundary is a route that cannot be prerendered, and
  // the banner over this grid has no reason to wait for one.
  const currency = await requestDisplayCurrency();

  return (
    <>
      <ShopToolbar
        pagination={pagination}
        sort={query.sort}
        action={path}
        messages={messages.listing}
      />

      {/*
        The design's List:margin — 25px above the grid — and its four columns
        from `bar`, which is where the rest of the storefront decides a window
        is a desktop one. See `--breakpoint-bar` in globals.css.
      */}
      <div className="grid grid-cols-1 gap-[30px] pt-[25px] sm:grid-cols-2 bar:grid-cols-4">
        {items.map((product, index) => (
          <ShopProductCard
            key={product.id}
            product={product}
            eager={index === 0}
            locale={locale}
            currency={currency}
            messages={messages}
          />
        ))}
      </div>

      <ShopPagination
        pagination={pagination}
        sort={query.sort}
        path={path}
        messages={messages.listing}
      />
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
      <div className="flex items-center justify-between gap-[13px] border-b border-line pt-[56px] pb-5">
        <div className="h-4 w-[209px] bg-mist" />
        <div className="h-11 w-[202.727px] border border-line" />
      </div>

      <div className="grid grid-cols-1 gap-[30px] pt-[25px] sm:grid-cols-2 bar:grid-cols-4">
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} className={`${PRODUCT_CARD_HEIGHT} bg-mist`} />
        ))}
      </div>

      <div className="h-[116px]" />
    </div>
  );
}
