import { describe, expect, it } from "vitest";
import {
  ADMIN_NAV,
  isActiveHref,
  isGroupActive,
  toggleCollapsed,
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

describe("toggleCollapsed", () => {
  it("closes an open group", () => {
    expect(toggleCollapsed([], "products")).toEqual(["products"]);
  });

  it("reopens a closed one", () => {
    expect(toggleCollapsed(["products"], "products")).toEqual([]);
  });

  it("leaves the other groups alone", () => {
    // A group is collapsed for its own sake, not at the expense of the rest:
    // appending rather than replacing is the whole point.
    expect(toggleCollapsed(["orders"], "products")).toEqual([
      "orders",
      "products",
    ]);
    expect(toggleCollapsed(["orders", "products"], "orders")).toEqual([
      "products",
    ]);
  });

  it("does not mutate the list it was given", () => {
    // React state: a mutated array is the same reference, so the re-render is
    // skipped and the click silently does nothing.
    const collapsed = ["orders"];
    toggleCollapsed(collapsed, "products");

    expect(collapsed).toEqual(["orders"]);
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

  it("carries the two product screens", () => {
    const products = groups.find((group) => group.id === "products");
    expect(products?.items.map((item) => item.href)).toEqual([
      "/admin/products",
      "/admin/categories",
    ]);
  });
});
