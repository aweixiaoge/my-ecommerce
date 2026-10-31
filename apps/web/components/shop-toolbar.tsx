import type { Pagination, ProductSort } from "@my-ecommerce/shared";
import { SortSelect } from "@/components/sort-select";
import type { Messages } from "@/lib/i18n/messages";
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
  action,
  messages,
}: {
  pagination: Pagination;
  sort: ProductSort;
  /** The listing the sort control belongs to — see `SortSelect`. */
  action: string;
  /** This locale's `listing` slice of the catalog. */
  messages: Messages["listing"];
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-line pt-[56px] pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-[13px]">
      <p className="text-[11px] leading-4 font-medium tracking-[0.18em] text-ink-55 uppercase">
        {resultsLabel(pagination, messages)}
      </p>

      <SortSelect value={sort} action={action} messages={messages} />
    </div>
  );
}
