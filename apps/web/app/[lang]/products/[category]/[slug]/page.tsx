import { Suspense } from "react";
import type { Metadata } from "next";
import { requestLocale } from "@/lib/i18n/request";
import {
  ProductFallback,
  ProductPage,
  loadProduct,
  parseTab,
  productMetadata,
} from "../../product-page";

/**
 * A product at the address it has: `/products/<category>/<slug>` (Figma node
 * 178:2890).
 *
 * The route is a shell and nothing else — it reads the two path segments and
 * the tab off the URL, hands them to `ProductPage`, and serves the skeleton
 * while that resolves. Everything the page *is* lives in the component, because
 * `/products/<slug>` renders the same page for a product filed in no category.
 *
 * ## Why this function is not `async`
 *
 * `params` is runtime data, so under Cache Components a route that reads it
 * cannot be prerendered — and reading it *outside* a `<Suspense>` boundary is a
 * build error rather than a slow page. Awaiting it inside the boundary is what
 * keeps a static shell: the chrome and the skeleton ship immediately, and the
 * product streams into them. The same split, for the same reason, as the shop
 * page's `searchParams`.
 *
 * ## Why there is no `generateStaticParams`
 *
 * The slugs are rows in a table, so listing them at build time would make
 * `next build` require a live database — which the shop page deliberately
 * avoids. An unlisted param already works here: the shell is served and the
 * content resolves per request.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  // The category segment is not read: a product has one title and one
  // description whichever of its addresses it was reached by, and a request
  // under a category it is not filed in is on its way to the canonical one.
  const [{ slug }, locale] = await Promise.all([params, requestLocale()]);

  return productMetadata(await loadProduct(slug, locale));
}

export default function ProductRoute(
  props: PageProps<"/[lang]/products/[category]/[slug]">,
) {
  return (
    <section className="container-content pt-[30px] pb-[50px]">
      <Suspense fallback={<ProductFallback />}>
        {Promise.all([props.params, props.searchParams]).then(
          async ([params, searchParams]) => {
            const locale = await requestLocale();

            return (
              <ProductPage
                requestedPath={`/${locale}/products/${params.category}/${params.slug}`}
                slug={params.slug}
                tab={parseTab(searchParams.tab)}
                locale={locale}
              />
            );
          },
        )}
      </Suspense>
    </section>
  );
}
