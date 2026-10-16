import { prisma, type Prisma } from "@my-ecommerce/db";
import {
  paginate,
  type Paginated,
  type ProductSort,
  type ProductSummary,
} from "@my-ecommerce/shared";
import { SHOP_PAGE_SIZE, sortProducts } from "../shop";
import { SHOP_PRODUCT_SELECT, toSummary } from "./product-summary";
import { getProductRatings } from "./reviews-repo";

/**
 * Reading the catalogue for the storefront.
 *
 * It replaced the fixture, and it replaced it the way that file promised: same
 * function name, same signature, same return shape, so the page above it
 * changed by one import line. What the fixture could not do is show a product
 * somebody added — a catalogue that ignores the database is a catalogue that
 * lies about what the shop sells. The fixture is gone; this is where the
 * storefront's reads live.
 *
 * The filtering, ordering and paging rules are unchanged, because they are not
 * this file's to decide. `sortProducts` in `lib/shop.ts` owns the order (it
 * compares decimal strings and keeps equal prices stable) and `paginate` in
 * `@my-ecommerce/shared` owns the page-clamping, and both already have tests. A
 * SQL `ORDER BY` here would be a second implementation of the same rules, in a
 * second language, that the next change would have to keep in step.
 *
 * What a row *means* is not here either — `./product-summary` owns that, because
 * the related-products row on a product page needs the same answer.
 */

/**
 * One page of the shop listing, ordered and paginated.
 *
 * Only `active` products. The status column is the whole record of whether a
 * product is for sale — plan.md's decision 7 makes going live a deliberate act
 * and deletion an archival one — so a draft appearing here would be the shop
 * publishing something nobody published.
 *
 * The read happens at request time, deliberately. Caching it under Cache
 * Components would need a `revalidateTag` in the admin's Publish action to
 * avoid going stale, and there is none: a shopper who cannot see a product the
 * admin just published is a worse bug than a query per visit.
 */
export async function getShopProducts(query: {
  page: number;
  sort: ProductSort;
  /**
   * Narrow the listing to one category, by id. Absent means the whole shop —
   * and a category page is the shop narrowed, not a second listing: the cards,
   * the ordering and the paging are this one's.
   */
  categoryId?: string;
}): Promise<Paginated<ProductSummary>> {
  const products = await prisma.product.findMany({
    where: listingWhere(query.categoryId),
    /*
     * The order the rows arrive in is the order "default sorting" means, and
     * the tie-break every price sort falls back on — `sortProducts` sorts in
     * place, stably, and a stable sort can only be as stable as its input.
     * Postgres promises nothing at all without an `ORDER BY`, so leaving it off
     * would make the default listing and every tie shuffle between requests.
     *
     * Newest first, matching `listProducts` in the admin repo, so the two agree
     * on what the catalogue's own order is. The id second, because `createdAt`
     * is only millisecond-precise and a batch import would tie on it.
     */
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: SHOP_PRODUCT_SELECT,
  });

  /*
   * One aggregate for every product the read returned, rather than one per
   * card. It spans the whole catalogue because the paging below happens in
   * JavaScript, after the sort — see the note above. That is one extra query
   * returning at most one row per reviewed product, and narrowing it to the
   * page's ids would mean attaching the rating *after* pagination, which is
   * the second mapping this file's header exists to refuse. If the catalogue
   * ever grows past what one query of aggregates should return, the fix is to
   * sort and page first and ask about the page — which is safe precisely
   * because nothing sorts by rating.
   */
  const ratings = await getProductRatings(products.map((product) => product.id));

  const summaries = products
    .map((product) => toSummary(product, ratings))
    .filter((summary): summary is ProductSummary => summary !== null);

  /*
   * Ordered and sliced here rather than in the page, because it is the
   * server's job: `?page=` and `?sort=` are query parameters, and a client that
   * filtered its own copy of the catalogue could not be paginated, crawled, or
   * trusted. Note the sort is applied to the whole list and the page taken
   * afterwards — sorting a page at a time would put the cheapest product of
   * page two above the dearest of page one.
   */
  return paginate(sortProducts(summaries, query.sort), query.page, SHOP_PAGE_SIZE);
}

/**
 * The newest products the shop is selling, for the home page's grid.
 *
 * The same shape as `listRelatedProducts`: a `take` in SQL rather than the whole
 * catalogue, because this is a *window* onto it — eight cards — and the shop's
 * own grid and pager are what exists for everything past them.
 *
 * `toSummary` can still drop a row the shop cannot render (no translation in
 * this locale, nothing priced), so a catalogue with unpriced rows shows fewer
 * than `limit`. That is the related row's behaviour too, and the alternative —
 * fetching more until eight survive — would make the home page the one screen
 * that shows products the shop would not.
 */
export async function listNewArrivals(limit: number): Promise<ProductSummary[]> {
  const rows = await prisma.product.findMany({
    where: { status: "active" },
    // Newest first, the catalogue's own order everywhere else — with the id
    // breaking a same-millisecond tie rather than the query plan.
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: limit,
    select: SHOP_PRODUCT_SELECT,
  });

  const ratings = await getProductRatings(rows.map((row) => row.id));

  return rows
    .map((row) => toSummary(row, ratings))
    .filter((summary): summary is ProductSummary => summary !== null);
}

/**
 * What a listing is a listing *of*.
 *
 * Narrowing by id rather than by slug: a category page has already looked the
 * category up — it has to, to know the URL is a category's at all and to put
 * the name in the heading — so the join back through `category_translations`
 * would be a second answer to a question already answered. The id is also the
 * key `@@index([categoryId])` on the join table is there for.
 *
 * Only `active` products, in either case. The status column is the whole record
 * of whether something is for sale (plan.md's decision 7), so a draft filed in
 * a category must not appear in it.
 *
 * A category's own products, not its descendants': the tree editor does not
 * exist yet, and every category the admin can create is a root — see the
 * `Category` comment in `schema.prisma`. When a category can have children,
 * this is the function that grows the walk.
 */
function listingWhere(categoryId: string | undefined): Prisma.ProductWhereInput {
  if (!categoryId) return { status: "active" };

  return { status: "active", categories: { some: { categoryId } } };
}
