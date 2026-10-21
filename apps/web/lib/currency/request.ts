import { cache } from "react";
import { cookies } from "next/headers";
import {
  CURRENCY_COOKIE,
  displayCurrency,
  type DisplayCurrency,
} from "./display";
import { listExchangeRates } from "./rates-repo";

/**
 * The currency one request writes its prices in.
 *
 * Read from the cookie rather than from the address, which is the decision
 * `packages/shared/src/common.ts` records: a currency in the path would make
 * every page crawlable in every currency, and the choice a reader makes here is
 * a preference rather than a piece of content.
 *
 * Everything that needs it comes through this one function — the header's
 * switcher, the home page's grid, the shop, a product page — so a page whose
 * three sections and header all ask makes one query rather than four. React's
 * `cache` is memoisation *within a request* and not a lifetime, which is the
 * right shape: two readers with different cookies must never share an answer,
 * and the same reader's sections must not ask twice. `loadProduct` in
 * `app/[lang]/products/product-page.tsx` is the same pattern for the same
 * reason.
 *
 * A cookie naming a currency the shop no longer quotes — or naming anything at
 * all — is not an error: `displayCurrency` falls back to the shop's own
 * currency, so a tampered cookie draws a USD page rather than breaking one.
 */
export const requestDisplayCurrency = cache(
  async (): Promise<DisplayCurrency> => {
    const chosen = (await cookies()).get(CURRENCY_COOKIE)?.value;

    return displayCurrency(await listExchangeRates(), chosen);
  },
);
