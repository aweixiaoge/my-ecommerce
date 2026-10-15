import {
  ProductSortSchema,
  compareMoney,
  type Pagination,
  type ProductSort,
  type ProductSummary,
} from "@my-ecommerce/shared";

/**
 * Everything the shop page derives from its URL and its data.
 *
 * This is deliberately a plain module with no React and no Next in it: page
 * state that lives in the URL is exactly the sort of thing that rots silently,
 * so the parsing, the ordering and the labels are all directly testable.
 */

/** 12 per page — four columns of three at the design's 4-up grid. */
export const SHOP_PAGE_SIZE = 12;

export type ShopQuery = {
  page: number;
  sort: ProductSort;
};

/** Sort dropdown options, in the order the control lists them. */
export const SORT_OPTIONS: ReadonlyArray<{ value: ProductSort; label: string }> = [
  { value: "default", label: "Default sorting" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
  { value: "name-asc", label: "Name, A to Z" },
];

/**
 * Reads `?page=` and `?sort=` off a search-params object.
 *
 * A repeated parameter (`?page=1&page=2`) yields an array; taking the first is
 * the convention every other framework uses, and refusing the whole URL would
 * be a worse answer than honouring the first value.
 *
 * An unparseable page becomes 1 rather than NaN — `paginate` then clamps, so a
 * hand-edited URL can never produce an empty page or throw.
 */
export function parseShopQuery(
  searchParams: Record<string, string | string[] | undefined>,
): ShopQuery {
  const rawPage = first(searchParams.page);
  const parsed = Number.parseInt(rawPage ?? "", 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

  // `safeParse` rather than an `as`: an unknown sort is a 404 in the making if
  // it ever reaches the database as a column name, so it falls back here.
  const rawSort = first(searchParams.sort);
  const sort = ProductSortSchema.safeParse(rawSort);

  return { page, sort: sort.success ? sort.data : "default" };
}

/**
 * Orders a listing. Returns a new array — the caller's list is a module-level
 * fixture in the mock today and a cached API response later, and neither should
 * be reordered in place.
 *
 * Price ordering compares decimal strings (see `compareMoney`), so nothing here
 * converts money to a float. Products that tie keep their catalogue order,
 * which is what makes "default" and an explicit sort agree on equal prices.
 */
export function sortProducts(
  products: ProductSummary[],
  sort: ProductSort,
): ProductSummary[] {
  const sorted = [...products];

  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => compareMoney(a.price, b.price));
    case "price-desc":
      return sorted.sort((a, b) => compareMoney(b.price, a.price));
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "default":
      return sorted;
  }
}

/**
 * The "Showing 1–12 of 13 results" line.
 *
 * An empty result set gets its own sentence: "Showing 0–0 of 0 results" is
 * arithmetically true and reads like a bug.
 */
export function resultsLabel(pagination: Pagination): string {
  if (pagination.total === 0) return "No results";

  const from = (pagination.page - 1) * pagination.perPage + 1;
  const to = Math.min(pagination.page * pagination.perPage, pagination.total);

  return `Showing ${from}–${to} of ${pagination.total} results`;
}

/** A page number, or an ellipsis standing in for the numbers skipped. */
export type PageSlot = number | "gap";

/**
 * The page numbers to render, as `[1, 2]` for the design's two pages.
 *
 * Always shows the first and last page and `span` pages either side of the
 * current one, dropping the numbers a single step away from an edge — a gap
 * that saves exactly one number costs a slot and reads worse than the number.
 */
export function pageNumbers(pagination: Pagination, span = 1): PageSlot[] {
  const { page, totalPages } = pagination;
  if (totalPages <= 0) return [];
  if (totalPages === 1) return [1];

  const start = Math.max(2, page - span);
  const end = Math.min(totalPages - 1, page + span);

  const slots: PageSlot[] = [1];
  if (start === 3) slots.push(2);
  else if (start > 3) slots.push("gap");

  for (let n = start; n <= end; n++) slots.push(n);

  if (end === totalPages - 2) slots.push(totalPages - 1);
  else if (end < totalPages - 2) slots.push("gap");

  slots.push(totalPages);

  return slots;
}

/**
 * The href for a page of the shop, with the defaults left off.
 *
 * `/shop` and `/shop?sort=default` are the same page; emitting only one of them
 * keeps the canonical URL stable and stops crawlers indexing the variants.
 */
export function shopHref(query: Partial<ShopQuery>): string {
  const params = new URLSearchParams();
  if (query.sort && query.sort !== "default") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));

  const search = params.toString();
  return search ? `/shop?${search}` : "/shop";
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
