import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestDisplayCurrency } from "./request";

/**
 * The request's currency, with the two things it reads stood in for: the
 * cookie jar and the database.
 *
 * Both are the environment rather than this app's own code — `next/headers`
 * needs a request, and the database needs a database — so mocking them is what
 * leaves `displayCurrency` doing the work being asserted.
 */
const jar = vi.hoisted(() => ({ get: vi.fn() }));
const db = vi.hoisted(() => ({ exchangeRate: { findMany: vi.fn() } }));

vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("@my-ecommerce/db", () => ({
  prisma: { exchangeRate: db.exchangeRate },
}));

const rate = (quote: string, value: string) => ({
  baseCurrency: "USD",
  quoteCurrency: quote,
  rate: { toString: () => value },
});

describe("requestDisplayCurrency", () => {
  beforeEach(() => {
    jar.get.mockReset();
    db.exchangeRate.findMany.mockReset();
    db.exchangeRate.findMany.mockResolvedValue([
      rate("EUR", "0.92"),
      rate("GBP", "0.79"),
    ]);
  });

  it("writes prices in the currency the reader chose", async () => {
    jar.get.mockReturnValue({ name: "currency", value: "EUR" });

    const display = await requestDisplayCurrency();

    expect(jar.get).toHaveBeenCalledWith("currency");
    expect(display.code).toBe("EUR");
    expect(display.options.map((option) => option.code)).toEqual([
      "USD",
      "EUR",
      "GBP",
    ]);
  });

  it("writes them in the shop's own currency when there is no cookie", async () => {
    jar.get.mockReturnValue(undefined);

    expect((await requestDisplayCurrency()).code).toBe("USD");
  });

  it("falls back rather than failing on a cookie naming no known currency", async () => {
    // The cookie outlives the rate row it named, or was never ours to begin
    // with. A page in the shop's own currency beats a page that cannot draw.
    jar.get.mockReturnValue({ name: "currency", value: "JPY" });

    expect((await requestDisplayCurrency()).code).toBe("USD");
  });

  it("asks only for the rates quoted from the shop's own currency", async () => {
    // The cookie decides which currency is *offered*; it never decides what is
    // asked of the database.
    jar.get.mockReturnValue({ name: "currency", value: "GBP" });

    await requestDisplayCurrency();

    expect(db.exchangeRate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { baseCurrency: "USD" } }),
    );
  });
});
