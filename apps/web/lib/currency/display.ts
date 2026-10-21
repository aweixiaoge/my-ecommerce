import type { Money } from "@my-ecommerce/shared";

/*
 * The integers the conversion below is written in, spelled out rather than
 * written as literals — the app targets ES2017, and `1n` is syntax TypeScript
 * refuses below ES2020.
 */
const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const TEN = BigInt(10);
const MINUS_ONE = -ONE;

/**
 * Decimals in a written price, and the integer those decimals are counted in.
 *
 * Two for every currency on offer. plan.md's `currencies` table is where a
 * currency that does not — a yen, say — would be described, and this is the
 * value that would be read from it; until there is one, a per-currency figure
 * would be a column with the same number in it three times. Both readers of it
 * are below: the one that converts, and the one that writes the result out.
 */
const MINOR_UNITS = 2;
const MINOR_SCALE = TEN ** BigInt(MINOR_UNITS);

/**
 * The currency a price is written in, and how it got there.
 *
 * A reader's currency is a *display* preference, and the whole of this module
 * follows from that one fact:
 *
 * - It travels in a cookie and never in the URL. `packages/shared/src/common.ts`
 *   says why: the language is part of the address because each translation is
 *   separate content a search engine has to crawl, and a currency in the path
 *   would make every page crawlable in every currency.
 * - It is applied when a price is *written*, never when it is read or compared.
 *   The catalogue holds one price in the shop's currency, and money is a decimal
 *   string that `packages/shared/src/money.ts` forbids doing arithmetic on — so
 *   the sorting, the price spans and the "is this a range at all" question are
 *   all settled in the stored currency (`lib/catalog/pricing.ts`), and only the
 *   two figures that reach the page are converted.
 * - Converting *is* arithmetic on money, which is why nothing here is a float.
 *   The multiplication and the one rounding a price takes are done on scaled
 *   integers (see `convert`), so the euro a shopper is shown is the euro they
 *   are charged in a later phase.
 *
 * Everything here is pure — no React, no Next, no Prisma — because the
 * header's switcher and the price formatter sit on opposite sides of the
 * client/server boundary and both need it.
 */

/**
 * The currency the shop prices in, and the base of every rate.
 *
 * `lib/admin/product-variants.ts` writes every variant's price in it, so it is
 * the one currency a catalogue row is guaranteed to be in — and a rate table
 * quoted from it makes converting to any other currency one multiplication
 * rather than a chain of them.
 */
export const SHOP_CURRENCY = "USD";

/**
 * Where the reader's choice is kept. Read on the server, written by the
 * header's switcher.
 */
export const CURRENCY_COOKIE = "currency";

/**
 * One row of `exchange_rates`: units of `quote` per one `base`.
 *
 * The pair is the row's identity. The storefront reads the rows quoted from
 * `SHOP_CURRENCY` (`./rates-repo.ts`), which is what makes the table below flat
 * rather than a graph.
 */
export interface ExchangeRate {
  base: string;
  quote: string;
  /** As a decimal string, the way money crosses every other boundary here. */
  rate: string;
}

/**
 * One currency the header offers, and what it costs against the shop's own.
 *
 * A code and a rate rather than a name or a symbol: a currency code is a proper
 * noun that does not translate (`lib/i18n/messages/en.ts`), and the symbol, the
 * separators and the decimal mark belong to `Intl` when the price is written.
 */
export interface CurrencyOption {
  code: string;
  /** Units of this currency per one `SHOP_CURRENCY`, as a decimal string. */
  rate: string;
}

/**
 * What one request writes its prices in: the code, and everything the switcher
 * may offer.
 *
 * `code` is always one of `options`, which is what stops a stale cookie — a
 * currency the shop has stopped quoting, or a value typed into devtools — from
 * putting the page in a currency nothing can be converted to. That invariant is
 * why this is built by `displayCurrency` and not assembled at a call site.
 */
export interface DisplayCurrency {
  /** The code prices are written in: the reader's choice, or the shop's own. */
  code: string;
  /** Every currency on offer, the shop's own first. */
  options: readonly CurrencyOption[];
}

/**
 * The display for a request: `chosen` where it can be honoured, the shop's own
 * currency otherwise.
 *
 * A row whose `base` is not the shop's currency is skipped rather than used —
 * it says nothing about what a price in the shop's currency costs elsewhere —
 * and so is one that quotes the shop's own currency, since being one unit of
 * itself is a fact and not something a row gets to restate. A table with no
 * rows therefore means a storefront that offers exactly one currency and
 * converts nothing, which is the state a fresh database should be in rather
 * than an error.
 */
export function displayCurrency(
  rates: readonly ExchangeRate[],
  chosen?: string,
): DisplayCurrency {
  const options: CurrencyOption[] = [{ code: SHOP_CURRENCY, rate: "1" }];

  for (const { base, quote, rate } of rates) {
    if (base !== SHOP_CURRENCY || quote === SHOP_CURRENCY) continue;
    if (options.some((option) => option.code === quote)) continue;

    options.push({ code: quote, rate });
  }

  return {
    code: options.find((option) => option.code === chosen)?.code ?? SHOP_CURRENCY,
    options,
  };
}

/**
 * A price in the reader's currency.
 *
 * Two amounts come back unchanged, and neither is a failure:
 *
 *   * **the price is already in the display currency.** Identity — multiplying
 *     by one and rounding to two decimals is a way of saying the same thing
 *     slowly.
 *   * **there is no rate for one of the two codes.** A hand-inserted row priced
 *     in a currency the shop does not quote is still a true price, and showing
 *     it as it stands is the answer `lib/catalog/pricing.ts` gives for a
 *     catalogue it cannot make sense of — rather than a figure invented here.
 *
 * It says nothing about whether two prices are comparable: never convert a list
 * and then order it. `compareMoney` refuses mixed currencies for exactly that
 * reason, and rounding is what makes two distinct prices equal.
 */
export function convertMoney(money: Money, display: DisplayCurrency): Money {
  if (money.currency === display.code) return money;

  const source = rateOf(display, money.currency);
  const target = rateOf(display, display.code);
  if (source === undefined || target === undefined) return money;

  const amount = convert(money.amount, source, target);

  return amount === null ? money : { amount, currency: display.code };
}

/** The rate for `code`, or nothing — a code no option names has no rate. */
function rateOf(display: DisplayCurrency, code: string): string | undefined {
  return display.options.find((option) => option.code === code)?.rate;
}

/**
 * `amount × target / source`, exactly, as a decimal string.
 *
 * Three scalars, one division, all in integers — for the reason this module
 * exists: `0.92` is not a number a binary float can hold, and a price is not
 * the place to find out what that costs. Each string becomes a scaled integer
 * and a count of its decimals, the integers are multiplied, and the single
 * rounding happens at the end rather than at every step.
 *
 * `null` when a string is not a decimal at all, which a rate out of the
 * database could be if somebody wrote one by hand. The caller reads that as "no
 * conversion", the same as a missing rate.
 */
function convert(
  amount: string,
  source: string,
  target: string,
): string | null {
  const a = decimal(amount);
  const s = decimal(source);
  const t = decimal(target);
  if (a === null || s === null || t === null) return null;

  /*
   * The product is `(a.units × t.units) / s.units`, in units of ten to the
   * minus `exponent`:
   *
   *     amount        = a.units × 10^-a.scale
   *     target/source = t.units / s.units × 10^(s.scale - t.scale)
   *
   * `MINOR_UNITS` folds in the move out of decimals and into the tenths and
   * hundredths `Intl` is handed. One exponent, positive or negative, rather
   * than a scale carried beside the number and applied at the end.
   */
  const exponent = MINOR_UNITS + s.scale - t.scale - a.scale;
  const product = a.units * t.units;
  const numerator = exponent >= 0 ? product * powerOfTen(exponent) : product;
  const denominator =
    exponent >= 0 ? s.units : s.units * powerOfTen(-exponent);

  return decimalString(divideRounded(numerator, denominator));
}

/** A decimal string as a scaled integer and the number of decimals in it. */
function decimal(value: string): { units: bigint; scale: number } | null {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (match === null) return null;

  const [, sign, whole, fraction = ""] = match;

  return {
    units: BigInt(`${whole}${fraction}`) * (sign === "-" ? MINUS_ONE : ONE),
    scale: fraction.length,
  };
}

/**
 * `numerator / denominator`, to the nearest integer, halves away from zero.
 *
 * `BigInt` division truncates toward zero, so the remainder is what decides:
 * half the denominator or more is the next integer up. Both operands are made
 * positive first — `-1n / 2n` truncates to zero, which would round a negative
 * amount toward zero while its positive twin rounds away — and the sign goes
 * back on at the end.
 */
function divideRounded(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < ZERO !== denominator < ZERO;
  const n = negative ? -numerator : numerator;
  const d = negative ? -denominator : denominator;
  const quotient = n / d;
  const remainder = n % d;

  const rounded = remainder * TWO >= d ? quotient + ONE : quotient;

  return negative ? -rounded : rounded;
}

/** A whole number of minor units — hundredths — as a decimal string. */
function decimalString(units: bigint): string {
  const negative = units < ZERO;
  const magnitude = negative ? -units : units;
  const whole = magnitude / MINOR_SCALE;
  // Padded rather than divided: five hundredths is `0.05`, not `0.5`.
  const fraction = `${magnitude % MINOR_SCALE}`.padStart(MINOR_UNITS, "0");

  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

/** `10 ** exponent`, as a `BigInt`. */
function powerOfTen(exponent: number): bigint {
  return TEN ** BigInt(exponent);
}
