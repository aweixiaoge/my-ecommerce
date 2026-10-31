import Image from "next/image";
import Link from "next/link";
import type { Pagination, ProductSort } from "@my-ecommerce/shared";
import type { Messages } from "@/lib/i18n/messages";
import { listingHref, pageNumbers } from "@/lib/shop";

/**
 * The design's `Navigation - Products pagination` (node 178:8721): 60px of air,
 * then a 40px row with the page numbers centred and Next pinned right.
 *
 * Set in the storefront's luxury register: serif numerals, the current one in
 * ink over a short gold rule, the rest in grey, and Next as a square outline.
 *
 * The current page is a span rather than a link to the page you are already on,
 * which is what `aria-current="page"` is for and what stops a screen reader
 * announcing a destination that goes nowhere.
 *
 * The pager keeps the active sort in every href — paging is a move within a
 * sorted list, not a way to lose the sort — and `path` keeps every href on the
 * listing it was rendered for: the shop's pages under `/shop`, a category's
 * under `/products/<category>`, the Journal's under `/journal`.
 */
export function ShopPagination({
  pagination,
  sort,
  path,
  messages,
}: {
  pagination: Pagination;
  /** The listing's sort, kept across pages; the Journal has none. */
  sort?: ProductSort;
  /** The listing these pages belong to, e.g. `/shop`. Query state is added to it. */
  path: string;
  /** This locale's `listing` slice of the catalog. */
  messages: Messages["listing"];
}) {
  const slots = pageNumbers(pagination);

  // One page is not a choice. The design only draws a pager because its
  // catalogue has two.
  if (pagination.totalPages <= 1) return null;

  const nextPage = pagination.page + 1;
  const hasNext = nextPage <= pagination.totalPages;

  return (
    <nav aria-label={messages.pagination} className="pt-[72px]">
      <div className="relative flex h-11 items-center justify-center gap-[6px]">
        {slots.map((slot, index) =>
          slot === "gap" ? (
            <span
              key={`gap-${index}`}
              aria-hidden
              className="w-[40px] text-center font-display text-[17px] leading-[23.1px] text-ink-55"
            >
              …
            </span>
          ) : slot === pagination.page ? (
            <span
              key={slot}
              aria-current="page"
              className="flex h-11 w-[40px] items-center justify-center border-b border-gold font-display text-[17px] leading-[23.1px] text-ink tabular-nums"
            >
              {slot}
            </span>
          ) : (
            <Link
              key={slot}
              href={listingHref(path, { page: slot, sort })}
              className="flex h-11 w-[40px] items-center justify-center border-b border-transparent font-display text-[17px] leading-[23.1px] text-ink-55 tabular-nums transition-colors duration-300 hover:border-line hover:text-ink"
            >
              {slot}
            </Link>
          ),
        )}

        {hasNext && (
          <Link
            href={listingHref(path, { page: nextPage, sort })}
            className="absolute right-0 inline-flex h-11 items-center gap-3 border border-ink px-5 text-[11px] leading-4 font-medium tracking-[0.18em] text-ink uppercase transition-colors duration-300 hover:bg-ivory"
          >
            {messages.next}
            <Image src="/icons/chevron-right.svg" alt="" width={9} height={9} />
          </Link>
        )}
      </div>
    </nav>
  );
}
