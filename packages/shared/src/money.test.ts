import { describe, expect, it } from "vitest";
import { MoneySchema, compareMoney, type Money } from "./money";

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
