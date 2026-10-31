import Link from "next/link";
import type { AccountOrderRow } from "@/lib/account/orders-repo";
import { formatDate, formatPrice } from "@/lib/format";
import { fill, plural } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/languages";

/**
 * The Orders tab (Figma 178:7505): a five-column table, its header ruled off
 * with a 2px hairline and each row with a 1px one.
 *
 * "View" opens the order's confirmation page — the one checkout sent the
 * shopper to — with the order's own access key, so the account adds no second
 * way into an order and no second page to keep in step with the first.
 *
 * From `xl` the columns keep the design's proportions of its 1002px (95 /
 * 259 / 177 / 271 / 200) as percentages. Below it the table sizes them to
 * their content instead: at a 1024 window a fixed 17.7% leaves "Pending
 * payment" 101px and wraps it — the design's sample status, "Processing", is
 * shorter — while the date column sits half empty. Content sizing holds a
 * row to one line down to ~900px; under that the row (~590px of text at
 * 768) wraps to two lines rather than scrolling. Below `sm` a five-column
 * row cannot be read at all, so each order becomes a short labelled list.
 */
export function AccountOrders({
  orders,
  locale,
  messages,
}: {
  orders: AccountOrderRow[];
  locale: Locale;
  messages: Messages["account"];
}) {
  const table = messages.ordersTable;

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-start gap-[20px] border border-line bg-ivory px-[24px] py-[24px] sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-[18px] leading-7 text-ink">{table.empty}</p>
        <Link href={localePath(locale, "/shop")} className={BUTTON}>
          {table.browse}
        </Link>
      </div>
    );
  }

  const rows = orders.map((order) => ({
    order,
    number: `#${order.orderNumber}`,
    date: formatDate(order.createdAt, locale),
    status: messages.status[order.status],
    total: plural(order.itemCount, table.totalFor, {
      amount: formatPrice(order.grandTotal, order.display, locale),
    }),
    href: localePath(
      locale,
      `/checkout/order-received/${order.orderNumber}?key=${encodeURIComponent(order.accessKey)}`,
    ),
    viewLabel: fill(table.viewOrder, { number: order.orderNumber }),
  }));

  return (
    <>
      <table className="hidden w-full table-auto border-collapse text-left text-[15px] leading-[24.75px] tracking-[-0.234px] text-ink sm:table xl:table-fixed">
        <colgroup>
          <col className="xl:w-[9.5%]" />
          <col className="xl:w-[25.8%]" />
          <col className="xl:w-[17.7%]" />
          <col className="xl:w-[27%]" />
          <col className="xl:w-[20%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-ink">
            {[table.order, table.date, table.status, table.total, table.actions].map((label) => (
              <th key={label} scope="col" className={`${CELL} text-[11px] leading-4 font-medium tracking-[0.18em] text-ink-55 uppercase`}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.order.orderNumber} className="border-b border-line">
              <th scope="row" className={`${CELL} font-medium`}>
                {row.number}
              </th>
              <td className={CELL}>{row.date}</td>
              <td className={CELL}>{row.status}</td>
              <td className={CELL}>{row.total}</td>
              <td className={CELL}>
                <Link href={row.href} aria-label={row.viewLabel} className={`${BUTTON} w-full`}>
                  {table.view}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col sm:hidden">
        {rows.map((row) => (
          <li
            key={row.order.orderNumber}
            className="border-b border-line py-[15px] text-[15px] leading-[24.75px] text-ink first:border-t first:border-t-ink"
          >
            <dl className="grid grid-cols-[auto_1fr] gap-x-[16px] gap-y-[4px]">
              <dt className="font-semibold">{table.order}</dt>
              <dd className="text-right font-medium">{row.number}</dd>
              <dt className="font-semibold">{table.date}</dt>
              <dd className="text-right">{row.date}</dd>
              <dt className="font-semibold">{table.status}</dt>
              <dd className="text-right">{row.status}</dd>
              <dt className="font-semibold">{table.total}</dt>
              <dd className="text-right">{row.total}</dd>
            </dl>
            <Link href={row.href} aria-label={row.viewLabel} className={`${BUTTON} mt-[12px] w-full`}>
              {table.view}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/** 15px top and bottom, 10.5px a side — none outside the first and last columns. */
const CELL = "px-[10.5px] py-[15px] align-middle first:pl-0 last:pr-0";

const BUTTON =
  "inline-flex h-[40px] items-center justify-center border border-ink px-[20px] text-[12px] leading-5 font-medium tracking-[0.14em] whitespace-nowrap text-ink transition-colors duration-300 hover:bg-ink hover:text-paper";
