import { z } from "zod";

/**
 * Money crosses the wire as a decimal STRING, never a JSON number.
 *
 * JSON has no decimal type. `19.99` sent as a number becomes a binary float on
 * arrival, which is exactly the precision loss the database's `numeric` column
 * exists to prevent. The string is the contract; parse it into Decimal on the
 * server and format it for display in the UI — never do arithmetic on it in
 * JavaScript.
 */
export const MoneySchema = z.object({
  amount: z
    .string()
    .regex(/^-?\d+(\.\d+)?$/, "amount must be a decimal string, e.g. \"19.99\""),
  currency: z.string().length(3),
});

export type Money = z.infer<typeof MoneySchema>;

/**
 * Orders two Money values by amount, exactly.
 *
 * Sorting is not arithmetic — no total is derived from this — but it still must
 * not round trip through a float. `Number("1234567890.1234567")` and its
 * neighbour collapse to the same double, which makes the comparison return 0
 * for two different prices and leaves the order to the sort implementation.
 * Users see that as products shuffling between renders.
 *
 * So compare the parts as strings: sign, then integer digits, then fraction
 * digits padded to a common length.
 *
 * Amounts in different currencies have no meaningful order, so that is an
 * error rather than a silently wrong list.
 */
export function compareMoney(a: Money, b: Money): number {
  if (a.currency !== b.currency) {
    throw new Error(
      `cannot compare ${a.currency} with ${b.currency} — amounts in different currencies have no order`,
    );
  }

  const [aSign, aInt, aFrac] = splitAmount(a.amount);
  const [bSign, bInt, bFrac] = splitAmount(b.amount);

  if (aSign !== bSign) return aSign - bSign;

  const magnitude = compareMagnitude(aInt, aFrac, bInt, bFrac);
  // Negatives invert: -9 is less than -2 even though "9" sorts above "2".
  return aSign < 0 ? -magnitude : magnitude;
}

/** [sign, integer digits, fraction digits] — sign is -1, 0, or 1. */
function splitAmount(amount: string): [number, string, string] {
  const negative = amount.startsWith("-");
  const [int, frac = ""] = (negative ? amount.slice(1) : amount).split(".");

  const digits = int.replace(/^0+(?=\d)/, "");
  const zero = /^0*$/.test(digits) && /^0*$/.test(frac);

  return [zero ? 0 : negative ? -1 : 1, digits, frac.replace(/0+$/, "")];
}

function compareMagnitude(aInt: string, aFrac: string, bInt: string, bFrac: string): number {
  if (aInt.length !== bInt.length) return aInt.length < bInt.length ? -1 : 1;
  if (aInt !== bInt) return aInt < bInt ? -1 : 1;

  const width = Math.max(aFrac.length, bFrac.length);
  const a = aFrac.padEnd(width, "0");
  const b = bFrac.padEnd(width, "0");
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/*
 * Spelled out rather than written as `0n`: the web app targets ES2017, and a
 * bigint literal is syntax TypeScript refuses below ES2020.
 * `apps/web/lib/currency/display.ts` does the same for the same reason.
 */
const ZERO = BigInt(0);

/**
 * `a + b`, exactly.
 *
 * The cart's subtotal is the first place the storefront adds money up, and the
 * rule at the top of this file is what shapes it: no float ever holds an
 * amount. Each string becomes an integer count of its smallest written digit,
 * the integers are added, and the result is written back with as many decimals
 * as the more precise operand had — `"19.99" + "5"` is `"24.99"`, never
 * `"24.990000000000002"`.
 *
 * Different currencies are an error, for the reason `compareMoney` gives: a sum
 * of dollars and euros is not a number of either.
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `cannot add ${a.currency} to ${b.currency} — convert one of them first`,
    );
  }

  const scale = Math.max(fractionDigits(a.amount), fractionDigits(b.amount));

  return {
    amount: writeScaled(toScaled(a.amount, scale) + toScaled(b.amount, scale), scale),
    currency: a.currency,
  };
}

/**
 * `money × quantity`, exactly — a cart line's total.
 *
 * A quantity is a whole number of things, so this keeps the price's own
 * decimals: `"24.45" × 3` is `"73.35"`. A fractional or unsafe quantity is a
 * caller's bug rather than something to round.
 */
export function multiplyMoney(money: Money, quantity: number): Money {
  if (!Number.isSafeInteger(quantity)) {
    throw new Error(`cannot multiply money by ${quantity} — a quantity is a whole number`);
  }

  const scale = fractionDigits(money.amount);

  return {
    amount: writeScaled(toScaled(money.amount, scale) * BigInt(quantity), scale),
    currency: money.currency,
  };
}

/** How many digits an amount has after its decimal point. */
function fractionDigits(amount: string): number {
  return amount.split(".")[1]?.length ?? 0;
}

/** An amount as an integer number of `10^-scale` units. */
function toScaled(amount: string, scale: number): bigint {
  const negative = amount.startsWith("-");
  const [int, frac = ""] = (negative ? amount.slice(1) : amount).split(".");
  const units = BigInt(int + frac.padEnd(scale, "0"));

  return negative ? -units : units;
}

/** The inverse of `toScaled`: `10^-scale` units, as a decimal string. */
function writeScaled(units: bigint, scale: number): string {
  const negative = units < ZERO;
  const digits = (negative ? -units : units).toString().padStart(scale + 1, "0");
  const int = digits.slice(0, digits.length - scale);
  const frac = digits.slice(digits.length - scale);

  return `${negative ? "-" : ""}${int}${scale > 0 ? `.${frac}` : ""}`;
}

/**
 * `a − b`, exactly — what is left of a subtotal once a discount comes off.
 *
 * `addMoney` with the sign flipped, and the same refusal for two currencies.
 */
export function subtractMoney(a: Money, b: Money): Money {
  const negated = b.amount.startsWith("-") ? b.amount.slice(1) : `-${b.amount}`;
  return addMoney(a, { amount: negated, currency: b.currency });
}

/**
 * `percent`% of `money`, to the cent, rounding half away from zero — a
 * percentage coupon's discount.
 *
 * `percent` is a decimal string like the amounts are ("10", "12.5"), so the
 * share is taken in integers too: `"24.45"` at `"10"` is `"2.45"` (2.445
 * rounded), never a float's `2.4450000000000003`.
 */
export function percentOfMoney(money: Money, percent: string): Money {
  if (!/^\d+(\.\d+)?$/.test(percent)) {
    throw new Error(`cannot take ${percent}% — a percentage is a non-negative decimal string`);
  }

  const moneyScale = fractionDigits(money.amount);
  const percentScale = fractionDigits(percent);
  // money × percent, in 10^-(moneyScale + percentScale) units. Dividing by
  // 100 for the percent and multiplying by 100 for cents cancel, so what is
  // left is bringing the scale down to cents' — by 10^(moneyScale + percentScale).
  const product = toScaled(money.amount, moneyScale) * toScaled(percent, percentScale);
  const divisor = BigInt(10) ** BigInt(moneyScale + percentScale);
  const negative = product < ZERO;
  const magnitude = negative ? -product : product;
  const cents = (magnitude * BigInt(2) + divisor) / (divisor * BigInt(2));

  return { amount: writeScaled(negative ? -cents : cents, 2), currency: money.currency };
}
