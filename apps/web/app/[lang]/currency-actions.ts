"use server";

import { cookies } from "next/headers";
import { CurrencyCodeSchema } from "@my-ecommerce/shared";
import { CURRENCY_COOKIE } from "@/lib/currency/display";

/**
 * What the header's currency switcher does: remember the reader's choice.
 *
 * Thin on purpose, like the storefront's other actions — the rules are the
 * shared contract's and the writing is Next's — and it adds only the one thing
 * a component cannot do for itself.
 *
 * A Server Action rather than a `document.cookie` write in the browser, and the
 * difference is not style. Next re-renders the current page *and its layouts*
 * when an action sets a cookie, which is precisely the two places the currency
 * is read (`lib/currency/request.ts`); a client-side write is invisible to the
 * framework, so the grid and the header would keep the old currency until
 * something else happened to re-render them.
 *
 * A code the shop has no rate for — a tampered form, or a currency dropped from
 * the table since the menu was drawn — is stored rather than refused. Nothing
 * can be converted to it, so `displayCurrency` falls back to the shop's own
 * currency and the page is honest about it; refusing here would mean a
 * round trip to the database to say no to a preference.
 */
export async function setCurrency(formData: FormData): Promise<void> {
  const parsed = CurrencyCodeSchema.safeParse(formData.get("currency"));
  if (!parsed.success) return;

  (await cookies()).set(CURRENCY_COOKIE, parsed.data, {
    // Not readable from the browser, and it does not need to be: the switcher
    // is handed the code it is showing, and the server is the only reader. The
    // customer session cookie is httpOnly for a different reason — that one is
    // a credential.
    httpOnly: true,
    // Required in production and skipped outside it, for the reason
    // `lib/admin/session.ts` gives: `secure` over plain http is a silent
    // failure, and a LAN address such as http://192.168.1.10:3000 is a normal
    // way to look at this app on a phone.
    secure: process.env.NODE_ENV === "production",
    // "lax" so the cookie rides along on an ordinary navigation — a preference
    // that vanished when someone opened a link in a new tab would be a
    // preference that half worked.
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

/**
 * How long a choice lasts.
 *
 * Long enough that it is a setting rather than a session, short enough that a
 * currency nobody picks again goes away by itself. There is no "reset to the
 * shop's currency" in the menu — the shop's own currency is a row in it.
 */
const ONE_YEAR = 60 * 60 * 24 * 365;
