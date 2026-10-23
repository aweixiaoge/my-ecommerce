import { createHash, randomBytes } from "node:crypto";

/**
 * The customer's session credential: a random token in a cookie, and its hash
 * in `sessions.token_hash`.
 *
 * The cart's shape (`lib/cart/cart-token.ts`) and the admin's, for the same
 * reason — the cookie is the only place the raw token exists — under a cookie
 * name of its own. The admin's is `admin_session`, and the two never stand in
 * for each other (plan.md, decision 6).
 */

export const ACCOUNT_COOKIE = "account_session";

/** 256 bits, like the cart's and the admin's. */
const TOKEN_BYTES = 32;

/**
 * How long a session lasts.
 *
 * "Remember me" is thirty days, the cart's lifetime, so a remembered shopper
 * and their cart leave together. Without it the cookie has no expiry at all —
 * it goes when the browser does — and the row is given a day, so a browser
 * left open on a shared computer does not stay signed in for ever.
 */
export const REMEMBERED_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const BROWSER_TTL_MS = 24 * 60 * 60 * 1000;

export function newSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * The cookie's options, `httpOnly`, `secure` only in production and `lax` for
 * the reasons `lib/admin/session.ts` gives. A remembered session gets an
 * expiry; a browser session is left without one, which is what makes it one.
 */
export function sessionCookieOptions(remember: boolean) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(remember ? { maxAge: REMEMBERED_TTL_MS / 1000 } : {}),
  };
}
