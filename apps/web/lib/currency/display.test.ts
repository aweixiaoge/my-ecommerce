import { describe, expect, it } from "vitest";
import type { Money } from "@my-ecommerce/shared";
import {
  convertMoney,
  displayCurrency,
  SHOP_CURRENCY,
  type DisplayCurrency,
  type ExchangeRate,
} from "./display";

/**
 * The currency a price is written in, with no database and no request in the
 * room.
 *
 * What is worth pinning here is arithmetic and the two fallbacks: that a euro
 * price is exact rather than nearly right, and that a request which names a
 * currency the shop cannot convert to ends up in the shop's own rather than in
 * a figure nobody can stand behind.
 */

const rate = (quote: string, value: string, base = SHOP_CURRENCY): ExchangeRate => ({
  base,
  quote,
  rate: value,
});

/** The table the migration seeds, as the repository hands it over. */
const SEEDED = [rate("EUR", "0.92"), rate("GBP", "0.79")];

const usd = (amount: string): Money => ({ amount, currency: "USD" });

describe("displayCurrency", () => {
  it("offers the shop's own currency first, then the ones it has rates for", () => {
    expect(displayCurrency(SEEDED)).toEqual({
      code: "USD",
      options: [
        { code: "USD", rate: "1" },
        { code: "EUR", rate: "0.92" },
        { code: "GBP", rate: "0.79" },
      ],
    });
  });

  it("writes prices in the currency the reader chose", () => {
    expect(displayCurrency(SEEDED, "GBP").code).toBe("GBP");
  });

  it("falls back to the shop's own currency for a code nothing is quoted in", () => {
    // A cookie outliving the rate row it named, and a value nobody chose.
    expect(displayCurrency(SEEDED, "JPY").code).toBe("USD");
    expect(displayCurrency(SEEDED, undefined).code).toBe("USD");
  });

  it("offers nothing but the shop's currency when the table is empty", () => {
    // A fresh database rather than a failure: one currency, nothing converted.
    expect(displayCurrency([])).toEqual({
      code: "USD",
      options: [{ code: "USD", rate: "1" }],
    });
  });

  it("ignores a rate that is not quoted from the shop's currency", () => {
    // It says nothing about what a price in the shop's currency costs.
    const rates = [rate("GBP", "0.86", "EUR"), ...SEEDED];

    expect(displayCurrency(rates).options).toEqual([
      { code: "USD", rate: "1" },
      { code: "EUR", rate: "0.92" },
      { code: "GBP", rate: "0.79" },
    ]);
  });

  it("ignores a row that restates the shop's own currency", () => {
    // Being one unit of itself is a fact, not something a row gets to decide.
    const rates = [rate("USD", "1.07"), ...SEEDED];

    expect(displayCurrency(rates).options[0]).toEqual({ code: "USD", rate: "1" });
  });

  it("offers a code once, however many rows name it", () => {
    const rates = [rate("EUR", "0.92"), rate("EUR", "0.93")];

    expect(displayCurrency(rates).options).toHaveLength(2);
    expect(displayCurrency(rates, "EUR").code).toBe("EUR");
  });
});

describe("convertMoney", () => {
  const eur = () => displayCurrency(SEEDED, "EUR");

  it("converts at the rate, to the cent", () => {
    expect(convertMoney(usd("79.00"), eur())).toEqual({
      amount: "72.68",
      currency: "EUR",
    });
  });

  it("writes the amount as a decimal string, never a number", () => {
    // The contract every other price in the app is written to.
    expect(typeof convertMoney(usd("79.00"), eur()).amount).toBe("string");
  });

  it("leaves a price already in the display currency exactly as it is", () => {
    const price = usd("79.00");

    expect(convertMoney(price, displayCurrency(SEEDED, "USD"))).toBe(price);
  });

  it("converts through the shop's currency between two others", () => {
    // A price the shop quoted in euros, written for a reader in pounds:
    // 100 ÷ 0.92 dollars, then × 0.79.
    const price: Money = { amount: "100.00", currency: "EUR" };

    expect(convertMoney(price, displayCurrency(SEEDED, "GBP"))).toEqual({
      amount: "85.87",
      currency: "GBP",
    });
  });

  it("rounds a half up", () => {
    // 5.00 × 0.001 is exactly half a cent, and a shop rounds it up.
    const display = displayCurrency([rate("XXX", "0.001")], "XXX");

    expect(convertMoney(usd("5.00"), display).amount).toBe("0.01");
  });

  it("rounds a remainder below a half down", () => {
    const display = displayCurrency([rate("XXX", "0.001")], "XXX");

    expect(convertMoney(usd("4.00"), display).amount).toBe("0.00");
  });

  it("rounds a negative amount away from zero, as it does a positive one", () => {
    const display = displayCurrency([rate("XXX", "0.001")], "XXX");

    expect(convertMoney({ amount: "-5.00", currency: "USD" }, display).amount).toBe(
      "-0.01",
    );
  });

  it("rounds a cent a float would round the other way", () => {
    // 2.675 is the canonical one: the nearest double is below it, so
    // `Math.round(2.675 * 100) / 100` is 2.67 and a shop would lose a cent on
    // every such price. A rate of one keeps the amount itself the only input.
    const display = displayCurrency([rate("XXX", "1")], "XXX");

    expect(convertMoney(usd("2.675"), display).amount).toBe("2.68");
  });

  it("keeps an amount no float could hold", () => {
    // Past 2^53 a double cannot tell one integer from its neighbour, and money
    // is not a place to find that out.
    const display = displayCurrency([rate("XXX", "1")], "XXX");

    expect(convertMoney(usd("99999999999999999.99"), display).amount).toBe(
      "99999999999999999.99",
    );
  });

  it("converts an amount carrying more decimals than a price is written with", () => {
    expect(convertMoney(usd("9.999"), eur()).amount).toBe("9.20");
  });

  it("leaves a price alone when nothing quotes its currency", () => {
    // A hand-inserted row in a currency the shop does not sell in. The price is
    // still true; what is missing is a rate, and inventing one would not be.
    const price: Money = { amount: "1800", currency: "JPY" };

    expect(convertMoney(price, eur())).toBe(price);
  });

  it("leaves a price alone when the display currency has no rate", () => {
    // Unreachable through `displayCurrency`, which only ever names an offered
    // code — but the function is public and this is the answer if it happens.
    const display: DisplayCurrency = {
      code: "SEK",
      options: [{ code: "USD", rate: "1" }],
    };

    expect(convertMoney(usd("79.00"), display)).toEqual(usd("79.00"));
  });

  it("leaves a price alone when a rate is not a decimal at all", () => {
    // A row somebody typed into the table by hand.
    const display = displayCurrency([rate("EUR", "0,92")], "EUR");

    expect(convertMoney(usd("79.00"), display)).toEqual(usd("79.00"));
  });

  it("converts a zero price to zero", () => {
    expect(convertMoney(usd("0.00"), eur())).toEqual({
      amount: "0.00",
      currency: "EUR",
    });
  });
});
