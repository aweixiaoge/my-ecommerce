import { describe, expect, it } from "vitest";
import type { Money } from "@my-ecommerce/shared";
import { defaultVariant, priceOf, variantPriceSpan } from "./pricing";

/**
 * The pricing rules, with no database anywhere near them.
 *
 * Both storefront reads share these, so a mistake here is a card and a product
 * page agreeing on something untrue.
 */

const usd = (amount: string): Money => ({ amount, currency: "USD" });

describe("priceOf", () => {
  it("reads an amount and a currency as one price", () => {
    expect(priceOf({ priceAmount: "79.00", priceCurrency: "USD" })).toEqual([
      { amount: "79.00", currency: "USD" },
    ]);
  });

  it("keeps the decimal exact rather than passing a number", () => {
    // The column is `numeric` and `Decimal.toString()` is exact. A float would
    // lose the difference between this and its neighbour.
    expect(priceOf({ priceAmount: "1234567890.1234567", priceCurrency: "USD" })[0]?.amount).toBe(
      "1234567890.1234567",
    );
  });

  it("reads a price written with a Decimal-like object", () => {
    // What the driver actually hands back: Prisma's `Decimal`, not a string.
    const decimal = { toString: () => "34.23" };

    expect(priceOf({ priceAmount: decimal, priceCurrency: "USD" })).toEqual([usd("34.23")]);
  });

  it("has nothing for a variant with no amount", () => {
    expect(priceOf({ priceAmount: null, priceCurrency: "USD" })).toEqual([]);
  });

  it("has nothing for a variant with no currency", () => {
    // Half a price is not a price: the amount means nothing without the unit,
    // and passing it on makes `Intl.NumberFormat` throw mid-render.
    expect(priceOf({ priceAmount: "34.23", priceCurrency: null })).toEqual([]);
  });

  it("has nothing for a variant with neither", () => {
    expect(priceOf({ priceAmount: null, priceCurrency: null })).toEqual([]);
  });
});

describe("variantPriceSpan", () => {
  it("collapses one price to a single figure", () => {
    expect(variantPriceSpan([usd("79.00")])).toEqual({
      price: usd("79.00"),
      priceMax: null,
    });
  });

  it("spans two prices, cheapest first", () => {
    expect(variantPriceSpan([usd("18.00"), usd("21.00")])).toEqual({
      price: usd("18.00"),
      priceMax: usd("21.00"),
    });
  });

  it("finds the cheapest whatever order they arrive in", () => {
    // The rows are not promised in any order, so "the first is the cheapest"
    // is exactly the assumption that would break.
    expect(variantPriceSpan([usd("21.00"), usd("18.00")])).toEqual({
      price: usd("18.00"),
      priceMax: usd("21.00"),
    });
  });

  it("treats one price written two ways as one price", () => {
    // "79" and "79.00" are the same amount; comparing the strings would put a
    // "$79.00 – $79.00" range on the card.
    expect(variantPriceSpan([usd("79"), usd("79.00")])?.priceMax).toBeNull();
  });

  it("spans three prices across the middle one", () => {
    expect(variantPriceSpan([usd("24.45"), usd("35.33"), usd("34.23")])).toEqual({
      price: usd("24.45"),
      priceMax: usd("35.33"),
    });
  });

  it("has no span when nothing is priced", () => {
    // Not "$0.00" — a product nobody has costed is not a free one.
    expect(variantPriceSpan([])).toBeNull();
  });

  it("has no span when the prices are in two currencies", () => {
    // `compareMoney` throws on mixed currencies rather than guessing an order,
    // and one contradictory row must not take a page down with it.
    expect(variantPriceSpan([usd("79.00"), { amount: "79.00", currency: "EUR" }])).toBeNull();
  });
});

describe("defaultVariant", () => {
  const v = (id: string, amount: string, inStock = true) => ({
    id,
    price: usd(amount),
    inStock,
  });

  it("picks the cheapest variant that is in stock", () => {
    expect(defaultVariant([v("a", "333.00"), v("b", "87.00")])?.id).toBe("b");
  });

  it("passes over a cheaper variant that is sold out", () => {
    expect(defaultVariant([v("a", "9.00", false), v("b", "87.00")])?.id).toBe("b");
  });

  it("falls back to the cheapest of all when nothing is in stock", () => {
    expect(defaultVariant([v("a", "90.00", false), v("b", "87.00", false)])?.id).toBe("b");
  });

  it("keeps the first of two equal prices, so ties do not flip", () => {
    expect(defaultVariant([v("a", "87.00"), v("b", "87")])?.id).toBe("a");
  });

  it("has nothing to pick from no variants", () => {
    expect(defaultVariant([])).toBeUndefined();
  });
});
