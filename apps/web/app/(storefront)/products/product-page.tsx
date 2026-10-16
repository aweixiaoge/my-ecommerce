import { Suspense, cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { MarkdownBody } from "@/components/markdown";
import { ProductPurchase } from "@/components/product/product-purchase";
import { ProductReviews } from "@/components/product/product-reviews";
import { ShopProductCard } from "@/components/shop-product-card";
import { canonicalRedirect, categoryPath } from "@/lib/catalog/product-path";
import { getProductBySlug, listRelatedProducts } from "@/lib/catalog/product-repo";
import { listApprovedReviews } from "@/lib/catalog/reviews-repo";
import { parseMarkdown } from "@/lib/markdown";

/**
 * The product page itself (Figma node 178:2890), as a component rather than a
 * route.
 *
 * It is a component because two routes render it. `/products/<category>/<slug>`
 * is the address a product has, and `/products/<slug>` is the address it used
 * to have — for a product filed in no category it is still the only one. Both
 * end here, and the difference between them is one string: the path that was
 * asked for, which this checks against the product's own.
 *
 * Everything drawn is the database's: the copy, the price span, the options a
 * shopper picks between, the images, the category in the breadcrumb.
 */

/** How many products the related row shows; the design gives it four columns. */
const RELATED_LIMIT = 4;

/**
 * One query per request, not two.
 *
 * `generateMetadata` and the page both need this product, and without this they
 * would ask the database twice for the same row on every view. `React.cache`
 * rather than `use cache`: this is memoization within a single request, not a
 * cache with a lifetime, and the page must show what the database holds now.
 *
 * Exported because each route's `generateMetadata` loads the same row the route
 * then renders.
 */
export const loadProduct = cache(getProductBySlug);

/** The two panels the design offers, in the order its tab strip lists them. */
const TABS = ["description", "reviews"] as const;
export type Tab = (typeof TABS)[number];

/**
 * Which panel is open, from `?tab=`.
 *
 * Read off the URL rather than held in state, because it is page state: a link
 * someone can share, a panel a crawler can reach, and the same rule the shop
 * page's `?page=` and `?sort=` follow. An unknown value falls back to the first
 * panel rather than 404ing — a hand-edited URL should land somewhere sensible.
 */
export function parseTab(value: string | string[] | undefined): Tab {
  const raw = Array.isArray(value) ? value[0] : value;
  return TABS.find((tab) => tab === raw) ?? "description";
}

/**
 * The page's metadata, from the row it is about.
 *
 * A function rather than a `generateMetadata` so both routes describe a product
 * the same way: a product has one title, and which of the two addresses it was
 * reached by is not part of it.
 */
export function productMetadata(
  detail: Awaited<ReturnType<typeof loadProduct>>,
): Metadata {
  if (!detail) return {};

  const { product } = detail;

  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? product.shortDescription ?? undefined,
  };
}

/**
 * `requestedPath` is the address this request came in on, because a product has
 * exactly one: anything else — the address it had before categories were in the
 * URL, or a second category it is also filed in — is sent there. See
 * `canonicalRedirect`.
 */
export async function ProductPage({
  requestedPath,
  slug,
  tab,
}: {
  requestedPath: string;
  slug: string;
  tab: Tab;
}) {
  const detail = await loadProduct(slug);
  // Not a product: no such slug, a slug whose product is not published, or one
  // with no price. All three are the same answer, which is what stops this URL
  // from confirming that an unpublished product exists.
  if (!detail) notFound();

  const redirectTo = canonicalRedirect(detail.product, requestedPath);
  if (redirectTo) permanentRedirect(redirectTo);

  const { product, imagesByVariant } = detail;

  const related = await listRelatedProducts({
    productId: product.id,
    categoryIds: product.categories.map((category) => category.id),
    limit: RELATED_LIMIT,
  });

  return (
    <>
      <Breadcrumb product={product} />

      <ProductPurchase product={product} imagesByVariant={imagesByVariant} />

      <Tabs active={tab} reviewCount={product.rating?.count ?? 0} />

      {/* Each panel carries its own offset from the tab strip, because the
          design gives them different ones: 30px for the copy, 40px for the
          reviews (Figma 178:3098 sits 40px inside 178:3096). */}
      {tab === "description" ? (
        <div className="pt-[30px]">
          <Description source={product.description} />
        </div>
      ) : (
        <div className="pt-[40px]">
          {/* Its own boundary rather than the page's: the reviews are a query
              of their own, and the product's block — the gallery, the price,
              the picker — has no reason to wait behind them. */}
          <Suspense fallback={<ReviewsFallback />}>
            <Reviews productId={product.id} productName={product.name} />
          </Suspense>
        </div>
      )}

      {related.length > 0 && <Related products={related} />}
    </>
  );
}

/**
 * `HOME › <CATEGORY> › <NAME>`, 13px semibold uppercase on the design's 1290
 * column, with a chevron between the items.
 *
 * The category is a link to its own page, which is the same address a card
 * links a product through — the two agree because both come from
 * `categoryPath`.
 */
function Breadcrumb({ product }: { product: { name: string; categories: { slug: string; name: string }[] } }) {
  const category = product.categories[0];

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center text-[13px] leading-[22px] font-semibold tracking-[-0.076px] text-ink uppercase"
    >
      <Link href="/">Home</Link>

      {category && (
        <>
          <Separator />
          <Link href={categoryPath(category)}>{category.name}</Link>
        </>
      )}

      <Separator />
      <span aria-current="page">{product.name}</span>
    </nav>
  );
}

function Separator() {
  // A chevron drawn rather than imported: it is two borders at an angle, and a
  // fifth icon file for it would be a fifth thing to keep in step with the
  // design's 8px.
  return (
    <span
      aria-hidden
      className="mx-[8px] inline-block h-[8px] w-[8px] rotate-45 border-t border-r border-ink"
    />
  );
}

/**
 * The tab strip: two 13px uppercase labels, the open one underlined.
 *
 * Links rather than buttons — selecting a tab changes the URL, so it is a
 * navigation and not a widget, and the browser's own affordances (open in a new
 * tab, copy the address) come for free. The hrefs are relative, so the strip
 * sits under whichever address the page was reached by.
 */
function Tabs({ active, reviewCount }: { active: Tab; reviewCount: number }) {
  const labels: Record<Tab, string> = {
    description: "Description",
    reviews: `Reviews (${reviewCount})`,
  };

  return (
    <div className="flex gap-[18px] overflow-x-auto border-b border-line pt-[50px]">
      {TABS.map((tab) => (
        <Link
          key={tab}
          href={tab === "description" ? "?" : `?tab=${tab}`}
          scroll={false}
          aria-current={tab === active ? "true" : undefined}
          className={`px-[18px] pt-[15px] pb-[15px] text-[13px] leading-[13px] font-semibold tracking-[-0.076px] uppercase ${
            tab === active
              ? "border-b-[3px] border-ink text-ink"
              : "text-ink-55"
          }`}
        >
          {labels[tab]}
        </Link>
      ))}
    </div>
  );
}

/**
 * The description, as the author wrote it.
 *
 * Rendering the source as markdown is a change rather than a port: the page
 * this replaces put `description` in a `<p>`, so an author who wrote `##` saw
 * two hashes. The authoring side has been markdown all along.
 */
function Description({ source }: { source: string }) {
  const blocks = parseMarkdown(source);
  if (blocks.length === 0) return null;

  return (
    <MarkdownBody
      blocks={blocks}
      className="flex max-w-[790px] flex-col gap-4 text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink"
    />
  );
}

/**
 * The reviews panel: what approved reviewers wrote, and the form that adds one.
 *
 * The read is approved-only — the moderation rule lives in the query, so this
 * page has nothing to remember about it — and it is a query of its own inside
 * its own `<Suspense>`, so a slow count never holds up the product above it.
 *
 * No pagination. The design draws a single list and plan.md gives reviews no
 * paging; when a product has enough reviews to need it, the shape is the shop
 * page's (`?page=` plus `shop-pagination`), not a second pattern.
 */
async function Reviews({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const reviews = await listApprovedReviews(productId);

  return (
    <ProductReviews
      reviews={reviews}
      productId={productId}
      productName={productName}
    />
  );
}

/** Other products in the same categories, on the design's four-column row. */
function Related({ products }: { products: Parameters<typeof ShopProductCard>[0]["product"][] }) {
  return (
    <section className="pt-[50px]">
      <h2 className="text-[20px] leading-[30px] font-bold tracking-[-0.449px] text-ink">
        Related products
      </h2>

      <div className="grid grid-cols-1 gap-[20px] pt-[30px] sm:grid-cols-2 bar:grid-cols-4">
        {products.map((product) => (
          <ShopProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

/**
 * What stands in for the product while it streams.
 *
 * Sized to the two-column product block so the tab strip and the related row
 * below it do not jump when the real content lands.
 */
export function ProductFallback() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="h-[22px] w-[300px] bg-mist" />

      <div className="grid grid-cols-1 gap-[40px] pt-[30px] bar:grid-cols-[625fr_625fr]">
        <div className="aspect-[625/659] w-full bg-mist" />
        <div className="flex flex-col gap-4">
          <div className="h-[45px] w-[70%] bg-mist" />
          <div className="h-[33px] w-[40%] bg-mist" />
          <div className="h-[27px] w-[85%] bg-mist" />
        </div>
      </div>
    </div>
  );
}

/**
 * What stands in for the review section while it streams.
 *
 * Two blocks the width of the design's columns, so the related row below does
 * not jump up when the real content lands.
 */
function ReviewsFallback() {
  return (
    <div aria-hidden className="grid animate-pulse grid-cols-1 gap-[64px] bar:grid-cols-2">
      <div className="h-[220px] w-full bg-mist" />
      <div className="h-[220px] w-full bg-mist" />
    </div>
  );
}
