import type { Pagination, ProductSort } from "@my-ecommerce/shared";
import { SortSelect } from "@/components/sort-select";
import { resultsLabel } from "@/lib/shop";

/**
 * The design's results bar (node 178:8384): 40px of air above a 40px row, the
 * count in 13px uppercase on the left and the sort control hard right.
 *
 * Below `sm` the row cannot hold a 207px sentence and a 202.727px control, so
 * it becomes two rows rather than wrapping the count and shrinking the select.
 */
export function ShopToolbar({
  pagination,
  sort,
}: {
  pagination: Pagination;
  sort: ProductSort;
}) {
  return (
    <div className="flex flex-col gap-3 pt-10 sm:flex-row sm:items-center sm:justify-between sm:gap-[13px]">
      <p className="text-[13px] leading-[21.45px] font-medium tracking-[0.4738px] text-ink uppercase">
        {resultsLabel(pagination)}
      </p>

      <SortSelect value={sort} />
    </div>
  );
}
