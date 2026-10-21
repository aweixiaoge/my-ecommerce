import { beforeEach, describe, expect, it, vi } from "vitest";
import { listExchangeRates } from "./rates-repo";

/**
 * The rates read, against a stand-in for the database.
 *
 * What is worth testing in a query this thin is the two decisions in it: which
 * rows the storefront is allowed to convert with, and how a rate crosses out of
 * the database — `Decimal` in, decimal string out, the handover every price in
 * the app makes.
 */
const db = vi.hoisted(() => ({ exchangeRate: { findMany: vi.fn() } }));

vi.mock("@my-ecommerce/db", () => ({
  prisma: { exchangeRate: db.exchangeRate },
}));

/** A row as the query returns one: `rate` is the driver's `Decimal`. */
const row = (quote: string, rate: string) => ({
  baseCurrency: "USD",
  quoteCurrency: quote,
  rate: { toString: () => rate },
});

describe("listExchangeRates", () => {
  beforeEach(() => db.exchangeRate.findMany.mockReset());

  it("reads only the rows quoted from the shop's own currency", async () => {
    // The decision that makes one multiplication enough: a rate quoted from
    // anything else says nothing about what a price in the shop's currency
    // costs elsewhere, and asking for it is a query nobody can explain.
    db.exchangeRate.findMany.mockResolvedValue([]);

    await listExchangeRates();

    expect(db.exchangeRate.findMany).toHaveBeenCalledWith({
      where: { baseCurrency: "USD" },
      orderBy: { quoteCurrency: "asc" },
      select: { baseCurrency: true, quoteCurrency: true, rate: true },
    });
  });

  it("hands a rate over as a decimal string, never a number", async () => {
    // `Decimal.toString()` is exact, and exactness is the point: `0.92` has no
    // double that is equal to it.
    db.exchangeRate.findMany.mockResolvedValue([row("EUR", "0.9200000000")]);

    expect(await listExchangeRates()).toEqual([
      { base: "USD", quote: "EUR", rate: "0.9200000000" },
    ]);
  });

  it("has nothing to convert with when the table is empty", async () => {
    db.exchangeRate.findMany.mockResolvedValue([]);

    expect(await listExchangeRates()).toEqual([]);
  });
});
