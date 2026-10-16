import { describe, expect, it } from "vitest";
import {
  ADMIN_NAV,
  isActiveHref,
  isGroupActive,
  isGroupOpen,
  NO_GROUP_CHOICES,
  toggleGroupOpen,
  type AdminNavGroup,
} from "./nav";

/**
 * A group shaped like the real one, so these cases do not break every time a
 * screen is added to `ADMIN_NAV`.
 */
const GROUP: AdminNavGroup = {
  id: "products",
  label: "Products",
  items: [
    { label: "Product", href: "/admin/products" },
    { label: "Category", href: "/admin/categories" },
  ],
};

describe("isActiveHref", () => {
  it("is active on its own route", () => {
    expect(isActiveHref("/admin/products", "/admin/products")).toBe(true);
  });

  it("stays active on a screen nested below it", () => {
    // A product detail screen is still the product screen as far as the
    // sidebar is concerned — losing the highlight on the way in would be the
    // bug, not the feature.
    expect(isActiveHref("/admin/products/42", "/admin/products")).toBe(true);
    expect(isActiveHref("/admin/products/42/edit", "/admin/products")).toBe(
      true,
    );
  });

  it("is not active on a sibling that merely shares the prefix", () => {
    // The case a plain `startsWith` gets wrong: `/admin/products-archive`
    // starts with `/admin/products` as characters but is a different screen,
    // and lighting up "Product" for it would be wrong.
    expect(isActiveHref("/admin/products-archive", "/admin/products")).toBe(
      false,
    );
  });

  it("is not active elsewhere in the admin", () => {
    for (const pathname of ["/admin", "/admin/categories", "/admin/orders"]) {
      expect(isActiveHref(pathname, "/admin/products")).toBe(false);
    }
  });

  it("is not active on a parent of its own route", () => {
    // The reverse direction: `/admin` must not light up as "Product".
    expect(isActiveHref("/admin", "/admin/products")).toBe(false);
  });
});

describe("isGroupActive", () => {
  it("is active when any of its screens is", () => {
    expect(isGroupActive("/admin/products", GROUP)).toBe(true);
    expect(isGroupActive("/admin/categories", GROUP)).toBe(true);
    expect(isGroupActive("/admin/categories/12", GROUP)).toBe(true);
  });

  it("is not active on a route outside the group", () => {
    for (const pathname of ["/admin", "/admin/orders", "/admin/products-x"]) {
      expect(isGroupActive(pathname, GROUP)).toBe(false);
    }
  });
});

describe("isGroupOpen", () => {
  it("opens the group the current screen is in", () => {
    expect(isGroupOpen("/admin/products", GROUP, NO_GROUP_CHOICES)).toBe(true);
    expect(isGroupOpen("/admin/categories/12", GROUP, NO_GROUP_CHOICES)).toBe(
      true,
    );
  });

  it("leaves a group the current screen is not in closed", () => {
    // The flip the single-group version deferred: a group must not sit open on
    // every screen just because it exists.
    expect(isGroupOpen("/admin/orders", GROUP, NO_GROUP_CHOICES)).toBe(false);
    expect(isGroupOpen("/admin/blogs", GROUP, NO_GROUP_CHOICES)).toBe(false);
  });

  it("closes every group on a screen that is in none of them", () => {
    // `/admin` itself: no group holds the route, so nothing opens on its own —
    // the dashboard's own copy already says to pick a screen from the sidebar.
    expect(isGroupOpen("/admin", GROUP, NO_GROUP_CHOICES)).toBe(false);
  });

  it("keeps a group open once it was opened by hand", () => {
    // Clicking a closed group's heading is what browsing the other half of the
    // admin looks like, so it must survive the navigation that follows.
    const state = { openByHand: ["products"], closedByHand: [] };

    expect(isGroupOpen("/admin/blogs", GROUP, state)).toBe(true);
  });

  it("keeps a group closed once it was closed by hand, even on its own screen", () => {
    // The person asked; navigation deliberately does not reopen it. A group
    // that springs back open after you collapse it feels broken.
    const state = { openByHand: [], closedByHand: ["products"] };

    expect(isGroupOpen("/admin/products", GROUP, state)).toBe(false);
  });
});

describe("toggleGroupOpen", () => {
  it("closes an open group and clears any hand-open entry", () => {
    // The invariant the two lists live by: an id in both would have no stated
    // winner, and the loser would be the person — a stale `closed` entry
    // collapses the group they are standing in.
    expect(
      toggleGroupOpen({ openByHand: ["products"], closedByHand: [] }, "products", true),
    ).toEqual({ openByHand: [], closedByHand: ["products"] });
  });

  it("opens a closed group and clears any hand-close entry", () => {
    expect(
      toggleGroupOpen({ openByHand: [], closedByHand: ["products"] }, "products", false),
    ).toEqual({ openByHand: ["products"], closedByHand: [] });
  });

  it("does not list one group twice", () => {
    const state = toggleGroupOpen(
      { openByHand: [], closedByHand: ["products"] },
      "products",
      true,
    );

    expect(state.closedByHand).toEqual(["products"]);
  });

  it("leaves the other groups alone", () => {
    // A group is opened for its own sake, not at the expense of the rest:
    // appending rather than replacing is the whole point.
    const state = toggleGroupOpen(
      { openByHand: ["blogs"], closedByHand: ["orders"] },
      "products",
      true,
    );

    expect(state.openByHand).toEqual(["blogs"]);
    expect(state.closedByHand).toEqual(["orders", "products"]);
  });

  it("does not mutate the state it was given", () => {
    // React state: a mutated object is the same reference, so the re-render is
    // skipped and the click silently does nothing.
    const openByHand = ["blogs"];
    const closedByHand = ["orders"];
    toggleGroupOpen({ openByHand, closedByHand }, "products", false);

    expect(openByHand).toEqual(["blogs"]);
    expect(closedByHand).toEqual(["orders"]);
  });
});

describe("ADMIN_NAV", () => {
  const groups: AdminNavGroup[] = [...ADMIN_NAV];
  const items = groups.flatMap((group) => [...group.items]);

  it("labels every group and every screen", () => {
    for (const group of groups) {
      expect(group.label.trim()).not.toBe("");
      for (const item of group.items) {
        expect(item.label.trim()).not.toBe("");
      }
    }
  });

  it("gives every screen a route under /admin", () => {
    // The sidebar is the admin's only navigation, so a link into the
    // storefront here would strand the person who follows it.
    for (const item of items) {
      expect(item.href.startsWith("/admin/")).toBe(true);
    }
  });

  it("keeps group ids and screen routes unique", () => {
    const ids = new Set(groups.map((group) => group.id));
    const hrefs = new Set(items.map((item) => item.href));

    expect(ids.size).toBe(groups.length);
    expect(hrefs.size).toBe(items.length);
  });

  it("has no empty group", () => {
    // An empty group renders as a control that opens onto nothing.
    for (const group of groups) {
      expect(group.items.length).toBeGreaterThan(0);
    }
  });

  it("carries the three product screens", () => {
    const products = groups.find((group) => group.id === "products");
    expect(products?.items.map((item) => item.href)).toEqual([
      "/admin/products",
      "/admin/categories",
      "/admin/features",
    ]);
  });

  it("carries the moderation queue", () => {
    // Every href here must resolve, so this is also the assertion that the
    // screen behind it exists in the same change as the entry.
    const reviews = groups.find((group) => group.id === "reviews");
    expect(reviews?.items.map((item) => item.href)).toEqual(["/admin/reviews"]);
  });

  it("carries the two blog screens", () => {
    const blogs = groups.find((group) => group.id === "blogs");
    expect(blogs?.items.map((item) => item.href)).toEqual([
      "/admin/blogs",
      "/admin/blog-categories",
    ]);
  });

  it("keeps every screen out of every other screen's route", () => {
    // The sidebar lights a link when the current path is at or below its route,
    // so one screen nested under another would light two links at once. This is
    // why the blog category screen is `/admin/blog-categories` and not
    // `/admin/blogs/categories` — the same reason the product category screen
    // is not under `/admin/products`.
    for (const item of items) {
      for (const other of items) {
        if (item === other) continue;

        expect(isActiveHref(item.href, other.href)).toBe(false);
      }
    }
  });
});
