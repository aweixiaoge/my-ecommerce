/**
 * The admin navigation.
 *
 * The same shape as the storefront's `lib/nav.ts`: the sidebar renders what
 * this describes, so adding a screen is an entry here rather than an edit to
 * the markup.
 *
 * Two levels, and they are different things. A *group* is a heading that opens
 * onto its screens — it has no route of its own — and an *item* is a screen.
 * `Products` is the group; `/admin/products` and `/admin/categories` are the
 * screens inside it.
 *
 * Every href here must resolve: the sidebar is the admin's only navigation, and
 * a menu entry pointing at an unbuilt route is worse than no entry. That is why
 * the storefront's `prefetch={false}` trick is not used here — these routes
 * exist, so they are safe to prefetch.
 */

export interface AdminNavItem {
  readonly label: string;
  /** An admin route. Must have a page behind it. */
  readonly href: string;
}

export interface AdminNavGroup {
  /** Stable key for expand/collapse state. Independent of the label. */
  readonly id: string;
  readonly label: string;
  readonly items: readonly AdminNavItem[];
}

export const ADMIN_NAV: readonly AdminNavGroup[] = [
  {
    id: "products",
    label: "Products",
    items: [
      { label: "Product", href: "/admin/products" },
      { label: "Category", href: "/admin/categories" },
    ],
  },
  {
    // A group of its own rather than another item under Products, because a
    // review is not a product: it belongs to one, it is written by somebody
    // else, and the screen is about deciding whether strangers may read it.
    id: "reviews",
    label: "Reviews",
    items: [{ label: "Review", href: "/admin/reviews" }],
  },
];

/**
 * Whether `href` is the screen being viewed, or a parent of it.
 *
 * The prefix comparison stops at a path boundary on purpose. `/admin/products`
 * has to stay lit on `/admin/products/42` — the detail screen is still the
 * product screen — but comparing characters alone would also light it up on
 * `/admin/products-archive`, which is a different screen entirely.
 *
 * `pathname` is `usePathname()`'s value: no query string, no hash, and no
 * trailing slash except at the root, so there is nothing to strip here.
 */
export function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Whether the current screen sits inside the group, so the group reads as active. */
export function isGroupActive(pathname: string, group: AdminNavGroup): boolean {
  return group.items.some((item) => isActiveHref(pathname, item.href));
}

/**
 * Opens a closed group, or closes an open one.
 *
 * The sidebar's only piece of state, kept here so it is testable rather than
 * buried in a component that vitest cannot render. It returns a new list
 * instead of mutating: the ids included in the result are the groups that stay
 * *closed*, so an implementation that replaced the list rather than appending
 * would collapse every other group as a side effect — which is the bug this
 * signature and its test exist to prevent.
 */
export function toggleCollapsed(
  collapsed: readonly string[],
  id: string,
): readonly string[] {
  return collapsed.includes(id)
    ? collapsed.filter((entry) => entry !== id)
    : [...collapsed, id];
}
