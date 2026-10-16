"use client";

import Image from "next/image";
import Form from "next/form";
import type { ProductSort } from "@my-ecommerce/shared";
import { SORT_OPTIONS } from "@/lib/shop";

/**
 * The design's `Dropdown - Shop order` (node 178:8389).
 *
 * In Figma this is a 202.727×40 box with an IMAGE fill — the chevron is painted
 * into a raster, not drawn as a node, so there is no vector to reuse from the
 * file. It is rebuilt here as a real control: a native `<select>` with the
 * design's 0.909px rule at 3px radius, and the app's own chevron-down glyph —
 * the same one the header uses — placed at the left, where the design draws it.
 *
 * Ordering is a query parameter, so the control is a GET form rather than
 * component state: the sort survives a refresh, a share, and the back button,
 * and it is server-side, which is the only place a real catalogue can sort.
 * `next/form` gives that a client-side navigation and a prefetch; the
 * `<noscript>` button is what makes it work with JavaScript off.
 *
 * `key` is the current sort so that arriving via the back button remounts the
 * select with the value the URL actually holds — `defaultValue` alone is read
 * once and would leave the control showing a sort the grid is not using.
 *
 * `action` is the listing it sorts — `/shop` on the shop page, the category's
 * own path on a category page. A form that always posted to `/shop` would take
 * a shopper sorting a category back to the whole catalogue, which is what this
 * prop exists to prevent.
 */
export function SortSelect({
  value,
  action,
}: {
  value: ProductSort;
  action: string;
}) {
  return (
    <Form action={action} className="relative block w-full sm:w-[202.727px]">
      <Image
        src="/icons/chevron-down.svg"
        alt=""
        width={9}
        height={6}
        className="pointer-events-none absolute top-1/2 left-[1px] -translate-y-1/2"
      />

      <select
        key={value}
        name="sort"
        defaultValue={value}
        aria-label="Sort products"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-10 w-full cursor-pointer appearance-none rounded-[3px] border-[0.909px] border-line bg-paper pl-[15.9px] text-[14px] leading-[23.1px] tracking-[-0.1504px] text-ink"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <noscript>
        <button
          type="submit"
          className="mt-2 h-10 w-full cursor-pointer rounded-[3px] border-[0.909px] border-line bg-paper text-[14px] text-ink"
        >
          Apply sorting
        </button>
      </noscript>
    </Form>
  );
}
