/**
 * The admin navigation.
 *
 * The same shape as the storefront's `lib/nav.ts`: the sidebar renders what
 * this describes, so adding a screen is an entry here rather than an edit to
 * the markup.
 *
 * Two levels, and they are different things. A *group* is a heading that opens
 * onto its screens — it has no route of its own — and an *item* is a screen.
 * `Products` holds `/admin/products`, `/admin/categories` and
 * `/admin/features`; `Blogs` holds `/admin/blogs` and `/admin/blog-categories`.
 * Which groups are open on a given screen is `isGroupOpen`'s to decide, with
 * the person's clicks overriding it.
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
      { label: "Feature", href: "/admin/features" },
    ],
  },
  {
    id: "blogs",
    label: "Blogs",
    items: [
      // Flat rather than `/admin/blogs/categories`, and not for tidiness: the
      // boundary rule in `isActiveHref` would light this group's "Blog" item
      // and its "Category" item at once on a nested route — the same reason the
      // product category screen is not under `/admin/products`.
      { label: "Blog", href: "/admin/blogs" },
      { label: "Category", href: "/admin/blog-categories" },
    ],
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
 * Which groups are open, as the two lists a person's clicks have filled.
 *
 * Both lists exist because a group's default depends on where you are: one
 * holding the current screen starts open, and one that does not starts closed.
 * `openByHand` and `closedByHand` are the clicks that went against that
 * default. They are keyed by group id — not by label, and not by index — so a
 * group stays open or closed on its own account as screens come and go.
 *
 * The sidebar's only piece of state, kept here so it is testable rather than
 * buried in a component that vitest cannot render. The two lists are kept
 * apart — `toggleGroupOpen` clears the opposite entry — because an id in both
 * would be a contradiction with no stated winner, and the loser would be the
 * person: hand-close a group while its screen is open, navigate away,
 * hand-open it, navigate back, and the stale `closed` entry would collapse the
 * group they are standing in.
 */
export interface GroupOpenState {
  readonly openByHand: readonly string[];
  readonly closedByHand: readonly string[];
}

export const NO_GROUP_CHOICES: GroupOpenState = {
  openByHand: [],
  closedByHand: [],
};

/**
 * Whether a group renders open on this screen.
 *
 * The default is the screen: a group holding the current route opens itself, so
 * the way back to where you are is always visible, and every other group starts
 * closed — which is what keeps a growing admin's sidebar from being one long
 * list. A click overrides the default in both directions: a group the person
 * opened stays open as they browse elsewhere, and one they closed stays closed
 * even while its screen is showing.
 *
 * The consequence to know about: on `/admin` itself no group is active, so
 * every group starts closed. That is the instruction "open only when it
 * contains the current screen" taken literally, and the dashboard's own copy
 * already tells the person to pick a screen from the sidebar.
 */
export function isGroupOpen(
  pathname: string,
  group: AdminNavGroup,
  { openByHand, closedByHand }: GroupOpenState,
): boolean {
  return isGroupActive(pathname, group)
    ? !closedByHand.includes(group.id)
    : openByHand.includes(group.id);
}

/**
 * The state after clicking a group heading, given whether it was open.
 *
 * It returns a new object instead of mutating, and it clears the id from the
 * opposite list so the two can never disagree about one group. The ids it does
 * not name are left alone, which is the whole point — an implementation that
 * replaced the lists rather than appending would collapse every other group the
 * person had arranged, and that is the bug this signature and its tests exist
 * to prevent.
 */
export function toggleGroupOpen(
  state: GroupOpenState,
  id: string,
  open: boolean,
): GroupOpenState {
  const without = (list: readonly string[]) =>
    list.filter((entry) => entry !== id);

  return open
    ? { openByHand: without(state.openByHand), closedByHand: [...without(state.closedByHand), id] }
    : { openByHand: [...without(state.openByHand), id], closedByHand: without(state.closedByHand) };
}
