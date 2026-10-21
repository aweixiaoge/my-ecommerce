import { prisma } from "@my-ecommerce/db";
import { SHOP_CURRENCY, type ExchangeRate } from "./display";

/**
 * The rates the storefront converts with.
 *
 * Only the rows quoted *from* the shop's own currency, and that is the whole
 * design: a price in the shop's currency converts to any offered one in a
 * single multiplication, so the table the page holds is flat rather than a
 * graph it would have to walk. A pair the shop does not quote does not appear —
 * `displayCurrency` would skip it anyway, and asking the database for rows
 * nothing can use is a query nobody can explain later.
 *
 * Ordered by the code, which is the order the switcher lists them in: the
 * shop's own currency first (it is not a row), then the rest alphabetically.
 *
 * The read is not cached. Two rows change when a provider says so rather than
 * per request, so a `use cache` lifetime is the eventual answer — but the
 * lifetime and the staleness story are the scheduled-updates phase's to decide,
 * and until then one indexed read that `requestDisplayCurrency` memoises per
 * request is the honest cost.
 */
export async function listExchangeRates(): Promise<ExchangeRate[]> {
  const rows = await prisma.exchangeRate.findMany({
    where: { baseCurrency: SHOP_CURRENCY },
    orderBy: { quoteCurrency: "asc" },
    select: { baseCurrency: true, quoteCurrency: true, rate: true },
  });

  return rows.map((row) => ({
    base: row.baseCurrency,
    quote: row.quoteCurrency,
    // `Decimal.toString()` is exact and is what every other price handover in
    // this app does — see `lib/catalog/pricing.ts`.
    rate: row.rate.toString(),
  }));
}
