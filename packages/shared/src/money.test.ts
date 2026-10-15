import { describe, expect, it } from "vitest";
import { MoneySchema } from "./money";

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
