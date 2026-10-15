import Image from "next/image";
import Link from "next/link";
import type { Pagination, ProductSort } from "@my-ecommerce/shared";
import { pageNumbers, shopHref } from "@/lib/shop";

/**
 * The design's `Navigation - Products pagination` (node 178:8721): 60px of air,
 * then a 40px row with the page numbers centred and Next pinned right.
 *
 * The current page is a span rather than a link to the page you are already on,
 * which is what `aria-current="page"` is for and what stops a screen reader
 * announcing a destination that goes nowhere.
 *
 * The pager keeps the active sort in every href — paging is a move within a
 * sorted list, not a way to lose the sort.
 */
export function ShopPagination({
  pagination,
  sort,
}: {
  pagination: Pagination;
  sort: ProductSort;
}) {
  const slots = pageNumbers(pagination);

  // One page is not a choice. The design only draws a pager because its
  // catalogue has two.
  if (pagination.totalPages <= 1) return null;

  const nextPage = pagination.page + 1;
  const hasNext = nextPage <= pagination.totalPages;

  return (
    <nav aria-label="Pagination" className="pt-[60px]">
      <div className="relative flex h-10 items-center justify-center gap-[13.573px]">
        {slots.map((slot, index) =>
          slot === "gap" ? (
            <span
              key={`gap-${index}`}
              aria-hidden
              className="w-[40.994px] text-center text-[14px] leading-[23.1px] font-semibold tracking-[-0.1504px] text-ink"
            >
              …
            </span>
          ) : slot === pagination.page ? (
            <span
              key={slot}
              aria-current="page"
              className="flex h-10 w-[40.994px] items-center justify-center rounded-[4px] bg-ink text-[14px] leading-[23.1px] font-semibold tracking-[-0.1504px] text-paper"
            >
              {slot}
            </span>
          ) : (
            <Link
              key={slot}
              href={shopHref({ page: slot, sort })}
              className="flex h-10 w-[40.994px] items-center justify-center rounded-[4px] text-[14px] leading-[23.1px] font-semibold tracking-[-0.1504px] text-ink"
            >
              {slot}
            </Link>
          ),
        )}

        {hasNext && (
          <Link
            href={shopHref({ page: nextPage, sort })}
            className="absolute right-0 inline-flex h-10 items-center gap-2 rounded-[4px] border-[1.818px] border-line px-[17px] text-[13px] leading-[21.45px] font-semibold tracking-[-0.0762px] text-ink uppercase"
          >
            Next
            <Image src="/icons/chevron-right.svg" alt="" width={9} height={9} />
          </Link>
        )}
      </div>
    </nav>
  );
}
