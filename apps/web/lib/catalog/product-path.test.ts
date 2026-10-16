import { describe, expect, it } from "vitest";
import { canonicalRedirect, categoryPath, productPath } from "./product-path";

/**
 * The storefront's URL policy, with no database and no React anywhere near it.
 *
 * These three strings are what every card links to and what the product route
 * checks its own address against, so the cases worth pinning are the ones where
 * a product does not have exactly one ordinary category.
 */
const category = (slug: string) => ({ id: `cat_${slug}`, slug, name: slug });

describe("productPath", () => {
  it("puts a product under the category it is filed in", () => {
    expect(
      productPath({ slug: "studio-over-ear", categories: [category("earphone")] }),
    ).toBe("/products/earphone/studio-over-ear");
  });

  it("uses the first category when a product is filed in several", () => {
    // The same rule the breadcrumb and the buy box follow: the admin's own
    // order, first one wins. A product's address must not depend on which of
    // its categories a query happened to return first.
    expect(
      productPath({
        slug: "studio-over-ear",
        categories: [category("earphone"), category("headphones")],
      }),
    ).toBe("/products/earphone/studio-over-ear");
  });

  it("leaves an unfiled product at the short address", () => {
    // Not an error state: a product nobody has categorised is still for sale,
    // and it has to be reachable to be bought.
    expect(productPath({ slug: "studio-over-ear", categories: [] })).toBe(
      "/products/studio-over-ear",
    );
  });
});

describe("categoryPath", () => {
  it("is the listing one segment below products", () => {
    expect(categoryPath(category("earbuds"))).toBe("/products/earbuds");
  });
});

describe("canonicalRedirect", () => {
  const filed = {
    slug: "studio-over-ear",
    categories: [category("earphone"), category("headphones")],
  };

  it("says nothing when the address is the product's own", () => {
    expect(
      canonicalRedirect(filed, "/products/earphone/studio-over-ear"),
    ).toBeNull();
  });

  it("sends the address a product used to have to the one it has", () => {
    expect(canonicalRedirect(filed, "/products/studio-over-ear")).toBe(
      "/products/earphone/studio-over-ear",
    );
  });

  it("sends a secondary category to the first one", () => {
    expect(
      canonicalRedirect(filed, "/products/headphones/studio-over-ear"),
    ).toBe("/products/earphone/studio-over-ear");
  });

  it("sends an unfiled product's categorised address back to the short one", () => {
    // The mirror image: a product that has no category is not under
    // `/products/<anything>/<product>`, and that address is not a second home.
    expect(
      canonicalRedirect({ slug: "studio-over-ear", categories: [] }, "/products/earphone/studio-over-ear"),
    ).toBe("/products/studio-over-ear");
    expect(
      canonicalRedirect({ slug: "studio-over-ear", categories: [] }, "/products/studio-over-ear"),
    ).toBeNull();
  });
});
