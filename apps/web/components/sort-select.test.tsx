import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SortSelect } from "./sort-select";

const render = (
  value: Parameters<typeof SortSelect>[0]["value"],
  action = "/shop",
) => renderToStaticMarkup(<SortSelect value={value} action={action} />);

const options = (markup: string) =>
  [...markup.matchAll(/<option[^>]*value="([^"]*)"/g)].map((m) => m[1]);

const selected = (markup: string) =>
  markup.match(/<option[^>]*value="([^"]*)"[^>]*selected/)?.[1] ?? null;

describe("SortSelect", () => {
  it("offers exactly the orders the contract accepts", () => {
    expect(options(render("default"))).toEqual([
      "default",
      "price-asc",
      "price-desc",
      "name-asc",
    ]);
  });

  it("opens on the order the URL asked for", () => {
    expect(selected(render("price-desc"))).toBe("price-desc");
    expect(selected(render("default"))).toBe("default");
  });

  it("submits to the listing it belongs to, as a GET", () => {
    const markup = render("default");

    expect(markup).toContain('action="/shop"');
    expect(markup).toContain('name="sort"');
    // A method of POST here would put the sort in a body the URL cannot carry.
    expect(markup).not.toContain('method="post"');
  });

  it("sorts a category page on the category page", () => {
    // The control is the shop's rendered on a category page too; posting to
    // `/shop` would sort the whole catalogue and drop the shopper out of the
    // category they were browsing.
    expect(render("default", "/products/earbuds")).toContain(
      'action="/products/earbuds"',
    );
  });

  it("carries a label, because the visible text is inside the control", () => {
    expect(render("default")).toContain('aria-label="Sort products"');
  });

  it("provides a submit button for browsers without JavaScript", () => {
    // The dropdown submits on change in script; without one the form would be
    // unusable, and the select would never reach the URL.
    expect(render("default")).toContain("<noscript>");
    expect(render("default")).toContain('type="submit"');
  });

  it("names every option in words rather than exposing the raw key", () => {
    const markup = render("default");

    expect(markup).toContain("Default sorting");
    expect(markup).toContain("Price, low to high");
    expect(markup).not.toContain(">price-asc<");
  });
});
