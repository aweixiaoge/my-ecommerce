import { describe, expect, it } from "vitest";
import {
  MoneySchema,
  addMoney,
  compareMoney,
  multiplyMoney,
  percentOfMoney,
  subtractMoney,
  type Money,
} from "./money";

describe("MoneySchema", () => {
  it("accepts a decimal-string amount with a 3-letter currency", () => {
    const result = MoneySchema.safeParse({ amount: "19.99", currency: "USD" });
    expect(result.success).toBe(true);
  });

  it("rejects a numeric amount, because a JSON number has already lost precision", () => {
    // This is the entire reason the field is a string. If a number ever parses,
    // the contract has stopped protecting the one thing it exists to protect.
    const result = MoneySchema.safeParse({ amount: 19.99, currency: "USD" });
    expect(result.success).toBe(false);
  });

  it("accepts amounts without a decimal point, including zero", () => {
    expect(MoneySchema.safeParse({ amount: "100", currency: "JPY" }).success).toBe(true);
    expect(MoneySchema.safeParse({ amount: "0", currency: "USD" }).success).toBe(true);
  });

  it("accepts a negative amount, which refunds and adjustments need", () => {
    expect(MoneySchema.safeParse({ amount: "-12.50", currency: "USD" }).success).toBe(
      true,
    );
  });

  it.each(["19.99.99", "1,000.00", "", "19.99 USD", "$19.99", "1e3", ".99", "19."])(
    "rejects the malformed amount %j",
    (amount) => {
      expect(MoneySchema.safeParse({ amount, currency: "USD" }).success).toBe(false);
    },
  );

  it("rejects a currency that is not exactly three characters", () => {
    for (const currency of ["US", "USDD", "", "U"]) {
      expect(MoneySchema.safeParse({ amount: "1.00", currency }).success).toBe(false);
    }
  });
});

describe("compareMoney", () => {
  const usd = (amount: string): Money => ({ amount, currency: "USD" });

  it("returns a negative number when the first amount is smaller", () => {
    expect(compareMoney(usd("9.09"), usd("9.10"))).toBeLessThan(0);
    expect(compareMoney(usd("2"), usd("10"))).toBeLessThan(0);
  });

  it("returns a positive number when the first amount is larger", () => {
    expect(compareMoney(usd("9.10"), usd("9.09"))).toBeGreaterThan(0);
    expect(compareMoney(usd("10"), usd("2"))).toBeGreaterThan(0);
  });

  it("returns zero for amounts that differ only in how they are written", () => {
    expect(compareMoney(usd("9.10"), usd("9.1"))).toBe(0);
    expect(compareMoney(usd("9.00"), usd("9"))).toBe(0);
    expect(compareMoney(usd("007.5"), usd("7.500"))).toBe(0);
    expect(compareMoney(usd("0"), usd("0.00"))).toBe(0);
    expect(compareMoney(usd("-0.00"), usd("0"))).toBe(0);
  });

  it("orders negatives the other way round, so the sort is not just a string compare", () => {
    expect(compareMoney(usd("-9.00"), usd("-2.00"))).toBeLessThan(0);
    expect(compareMoney(usd("-2.00"), usd("-9.00"))).toBeGreaterThan(0);
  });

  it("orders a negative below zero and a positive above it", () => {
    expect(compareMoney(usd("-0.01"), usd("0"))).toBeLessThan(0);
    expect(compareMoney(usd("0.01"), usd("0"))).toBeGreaterThan(0);
  });

  it("pads fraction digits instead of comparing their text", () => {
    // "9.5" < "9.45" as strings. As money it is the other way round.
    expect(compareMoney(usd("9.5"), usd("9.45"))).toBeGreaterThan(0);
    expect(compareMoney(usd("0.1"), usd("0.125"))).toBeLessThan(0);
  });

  it("compares past the point a float would call two prices equal", () => {
    // Both of these are the SAME double. A Number() round trip returns 0 here
    // and the list order becomes implementation-defined.
    const a = usd("12345678901234567.1");
    const b = usd("12345678901234567.2");
    expect(Number(a.amount)).toBe(Number(b.amount));
    expect(compareMoney(a, b)).toBeLessThan(0);
  });

  it("sorts an unsorted list into ascending price order", () => {
    const amounts = ["18.00", "9.50", "149.00", "9.45", "0", "1000", "12.5"];
    const sorted = amounts
      .map(usd)
      .sort(compareMoney)
      .map((m) => m.amount);

    expect(sorted).toEqual(["0", "9.45", "9.50", "12.5", "18.00", "149.00", "1000"]);
  });

  it("throws rather than inventing an order for two different currencies", () => {
    expect(() => compareMoney(usd("1.00"), { amount: "1.00", currency: "EUR" })).toThrow(
      /cannot compare USD with EUR/,
    );
  });
});

describe("addMoney", () => {
  const usd = (amount: string): Money => ({ amount, currency: "USD" });

  it("adds two prices to the cent", () => {
    expect(addMoney(usd("19.99"), usd("5.01"))).toEqual(usd("25.00"));
  });

  it("is exact where a float is not", () => {
    // 0.1 + 0.2 is the canonical float failure; money must never show it.
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(addMoney(usd("0.1"), usd("0.2"))).toEqual(usd("0.3"));
  });

  it("keeps the decimals of the more precise operand", () => {
    expect(addMoney(usd("19.99"), usd("5"))).toEqual(usd("24.99"));
    expect(addMoney(usd("5"), usd("0.125"))).toEqual(usd("5.125"));
  });

  it("adds whole amounts without inventing a decimal point", () => {
    expect(addMoney(usd("100"), usd("23"))).toEqual(usd("123"));
  });

  it("adds zero as the identity", () => {
    expect(addMoney(usd("0"), usd("87.00"))).toEqual(usd("87.00"));
  });

  it("handles negatives, crossing zero in both directions", () => {
    expect(addMoney(usd("10.00"), usd("-12.50"))).toEqual(usd("-2.50"));
    expect(addMoney(usd("-0.05"), usd("0.04"))).toEqual(usd("-0.01"));
    expect(addMoney(usd("-1.00"), usd("1.00"))).toEqual(usd("0.00"));
  });

  it("adds past the point a float would lose a cent", () => {
    expect(addMoney(usd("12345678901234567.01"), usd("0.01"))).toEqual(
      usd("12345678901234567.02"),
    );
  });

  it("refuses to add two currencies", () => {
    expect(() => addMoney(usd("1.00"), { amount: "1.00", currency: "EUR" })).toThrow(
      /cannot add USD to EUR/,
    );
  });
});

describe("multiplyMoney", () => {
  const usd = (amount: string): Money => ({ amount, currency: "USD" });

  it("multiplies a price by a quantity, keeping its decimals", () => {
    expect(multiplyMoney(usd("24.45"), 3)).toEqual(usd("73.35"));
    expect(multiplyMoney(usd("0.10"), 3)).toEqual(usd("0.30"));
  });

  it("keeps the currency", () => {
    expect(multiplyMoney({ amount: "5", currency: "EUR" }, 2)).toEqual({
      amount: "10",
      currency: "EUR",
    });
  });

  it("writes amounts under one unit with a leading zero", () => {
    expect(multiplyMoney(usd("0.01"), 1)).toEqual(usd("0.01"));
    expect(multiplyMoney(usd("0.01"), 0)).toEqual(usd("0.00"));
  });

  it("multiplies a negative amount", () => {
    expect(multiplyMoney(usd("-2.50"), 4)).toEqual(usd("-10.00"));
  });

  it.each([1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    "refuses the quantity %s rather than rounding it",
    (quantity) => {
      expect(() => multiplyMoney(usd("1.00"), quantity)).toThrow(/whole number/);
    },
  );
});

describe("subtractMoney", () => {
  const usd = (amount: string): Money => ({ amount, currency: "USD" });

  it("takes one amount from another exactly, keeping the finer scale", () => {
    expect(subtractMoney(usd("24.45"), usd("5"))).toEqual(usd("19.45"));
    expect(subtractMoney(usd("0.3"), usd("0.1"))).toEqual(usd("0.2"));
  });

  it("goes below zero rather than clamping — capping is the caller's rule", () => {
    expect(subtractMoney(usd("5.00"), usd("6.50"))).toEqual(usd("-1.50"));
  });

  it("subtracts a negative as an addition", () => {
    expect(subtractMoney(usd("5.00"), usd("-1.25"))).toEqual(usd("6.25"));
  });

  it("refuses two currencies", () => {
    expect(() => subtractMoney(usd("5"), { amount: "1", currency: "EUR" })).toThrow(/EUR/);
  });
});

describe("percentOfMoney", () => {
  const usd = (amount: string): Money => ({ amount, currency: "USD" });

  it("takes a whole percent to the cent", () => {
    expect(percentOfMoney(usd("80.00"), "10")).toEqual(usd("8.00"));
    expect(percentOfMoney(usd("5"), "10")).toEqual(usd("0.50"));
  });

  it("rounds a half cent up, where a float would land below it", () => {
    // 24.45 × 0.1 is 2.4450000000000003 as a double, and 1.005 × 100 is
    // 100.49999999999999 — both would round the wrong way.
    expect(percentOfMoney(usd("24.45"), "10")).toEqual(usd("2.45"));
    expect(percentOfMoney(usd("1.005"), "100")).toEqual(usd("1.01"));
  });

  it("rounds below a half cent down", () => {
    expect(percentOfMoney(usd("0.04"), "10")).toEqual(usd("0.00"));
  });

  it("takes a fractional percent", () => {
    expect(percentOfMoney(usd("19.99"), "12.5")).toEqual(usd("2.50"));
  });

  it("takes all of it at 100% and nothing at 0%", () => {
    expect(percentOfMoney(usd("19.99"), "100")).toEqual(usd("19.99"));
    expect(percentOfMoney(usd("19.99"), "0")).toEqual(usd("0.00"));
  });

  it("refuses a percent that is not a non-negative decimal string", () => {
    expect(() => percentOfMoney(usd("10"), "-5")).toThrow(/-5/);
    expect(() => percentOfMoney(usd("10"), "ten")).toThrow(/ten/);
  });
});
