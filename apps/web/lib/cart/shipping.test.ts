import { describe, expect, it } from "vitest";
import {
  FREE_SHIPPING_THRESHOLD,
  shippingCost,
  shipsFree,
  STANDARD_SHIPPING_RATE,
} from "./shipping";

const usd = (amount: string) => ({ amount, currency: "USD" });

describe("shipsFree", () => {
  it("is the trust bar's $50 promise", () => {
    expect(FREE_SHIPPING_THRESHOLD).toEqual(usd("50"));
  });

  it("ships free at the threshold and over it", () => {
    expect(shipsFree(usd("50.00"))).toBe(true);
    expect(shipsFree(usd("142.69"))).toBe(true);
  });

  it("does not ship free a cent under it", () => {
    expect(shipsFree(usd("49.99"))).toBe(false);
    expect(shipsFree(usd("0"))).toBe(false);
  });

  it("has no answer for another currency, so does not promise one", () => {
    expect(shipsFree({ amount: "500", currency: "EUR" })).toBe(false);
  });
});

describe("shippingCost", () => {
  it("charges the standard rate under the threshold, and nothing at it", () => {
    expect(STANDARD_SHIPPING_RATE).toEqual(usd("5.00"));
    expect(shippingCost(usd("21.23"))).toEqual(usd("5.00"));
    expect(shippingCost(usd("50.00"))).toEqual(usd("0.00"));
  });
});
