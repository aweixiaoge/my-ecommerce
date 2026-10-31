import { Suspense } from "react";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import {
  ProductPage,
  loadProduct,
  parseTab,
  productMetadata,
} from "../product-page";
import { ShopPagination } from "@/components/shop-pagination";
import { ShopProductCard } from "@/components/shop-product-card";
import { ShopToolbar } from "@/components/shop-toolbar";
import {
  foreignCategoryPath,
  getCategoryBySlug,
  type CategoryDetail,
} from "@/lib/catalog/category-repo";
import { categoryPath, categoryRedirect } from "@/lib/catalog/product-path";
import { getShopProducts } from "@/lib/catalog/products-repo";
import { requestDisplayCurrency } from "@/lib/currency/request";
import { getMessages } from "@/lib/i18n/messages";
import { requestLocale } from "@/lib/i18n/request";
import type { Locale } from "@/lib/languages";
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
 *
 * The slug is looked up in the language of the address first and the default
 * language second, so `/de/products/earbuds` finds the English category — and
 * is then sent to the German address, because a category has one address per
 * language and the English slug is not a second home. A category nobody has
 * translated is a category with products in it, not a 404: it has no German
 * slug to be sent to, so the English address is the address.
 */
type ProductsSearchParams = Awaited<
  PageProps<"/[lang]/products/[category]">["searchParams"]
>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const [{ category }, locale] = await Promise.all([params, requestLocale()]);

  const found = await getCategoryBySlug(category, locale);
  if (found) {
    // Empty rather than absent: a category with no copy of its own has no
    // description, which is not the same as one whose description is "".
    return { title: found.name, description: found.description || undefined };
  }

  // Not a category: a product, or nothing at all — `productMetadata` answers
  // `{}` for the second and 404s are Next's own.
  return productMetadata(await loadProduct(category, locale));
}

export default function ProductsSegmentPage(
  props: PageProps<"/[lang]/products/[category]">,
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
 *
 * Two sloppy addresses are repaired rather than refused. A category's English
 * slug is not a second home for its German page — `/de/products/headphones` is
 * on its way to `/de/products/kopfhorer`, the address every card and breadcrumb
 * links. And a slug from a language this page is not read in is what a link
 * between two languages carries (the switcher swaps the locale segment and
 * nothing else), so it is answered with the address the category has here
 * rather than a 404.
 */
async function Segment({
  segment,
  searchParams,
}: {
  segment: string;
  searchParams: ProductsSearchParams;
}) {
  const locale = await requestLocale();
  const requestedPath = `/${locale}/products/${segment}`;

  const category = await getCategoryBySlug(segment, locale);

  if (category) {
    const redirectTo = categoryRedirect(category, requestedPath, locale);
    if (redirectTo) permanentRedirect(redirectTo);

    return (
      <CategoryListing
        category={category}
        searchParams={searchParams}
        locale={locale}
      />
    );
  }

  // Nothing here answers to the slug as a category, and nothing in the default
  // language either: one more lookup before the product's, because `/fr` after
  // `/de/products/kopfhorer` is exactly this case.
  const elsewhere = await foreignCategoryPath(segment, locale);
  if (elsewhere !== null && elsewhere !== requestedPath) {
    permanentRedirect(elsewhere);
  }

  return (
    <section className="container-content pt-[30px] pb-[50px]">
      <ProductPage
        requestedPath={requestedPath}
        slug={segment}
        tab={parseTab(searchParams.tab)}
        locale={locale}
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
 * The heading is the shop banner's masthead — the centred serif and its gold
 * hairline — with the category's name in it. There is no frame for this page
 * in the Figma file — the storefront designs are Home, Shop and Product
 * Detail — so the block is the shop's, less the banner it has no artwork for.
 */
async function CategoryListing({
  category,
  searchParams,
  locale,
}: {
  category: CategoryDetail;
  searchParams: ProductsSearchParams;
  locale: Locale;
}) {
  const messages = getMessages(locale);
  const query = parseShopQuery(searchParams);
  const { items, pagination } = await getShopProducts(
    { ...query, categoryId: category.id },
    locale,
  );
  // Read here, inside the boundary this listing already streams behind — see
  // the note on the shop page's own read.
  const currency = await requestDisplayCurrency();

  const path = categoryPath(category, locale);

  return (
    <section className="pt-[72px] pb-[60px]">
      <div className="container-content">
        <header className="mx-auto max-w-[620px] text-center">
          <h1 className="font-display text-[40px] leading-[48px] font-normal [overflow-wrap:anywhere] text-ink sm:text-[48px] sm:leading-[56px]">
            {category.name}
          </h1>
          <div aria-hidden className="mx-auto mt-5 h-px w-8 bg-gold/50" />

          {category.description && (
            <p className="pt-6 text-[15px] leading-[27px] text-ink-62">
              {category.description}
            </p>
          )}
        </header>

        {items.length === 0 ? (
          /* No toolbar over an empty grid: the "no results" line and a sort
             control above nothing is a page that looks broken rather than
             empty. */
          <p className="mx-auto max-w-[620px] pt-[56px] text-center font-display text-[18px] leading-7 text-ink-55 italic">
            {messages.listing.emptyCategory}
          </p>
        ) : (
          <>
            <ShopToolbar
              pagination={pagination}
              sort={query.sort}
              action={path}
              messages={messages.listing}
            />

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
    <section className="pt-[72px] pb-[60px]">
      <div className="container-content" aria-hidden>
        <div className="mx-auto h-[48px] w-[280px] max-w-full animate-pulse bg-mist sm:h-[56px]" />
        <div className="mx-auto mt-5 h-px w-8 bg-gold/50" />
        <div className="grid grid-cols-1 gap-[30px] pt-[56px] sm:grid-cols-2 bar:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-[425.186px] animate-pulse bg-mist"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
