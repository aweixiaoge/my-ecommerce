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
