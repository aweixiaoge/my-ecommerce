import { createHash, randomBytes } from "node:crypto";

/**
 * The guest cart's credential: a random token in a cookie, and its hash in
 * `carts.token_hash`.
 *
 * The shape is the admin session's (`lib/admin/session-store.ts`) for the same
 * reason: the cookie is the only place the raw token exists, so a row read out
 * of the database is nothing a person can replay to open somebody's cart. It is
 * a smaller secret than a session — a cart holds no address and no payment —
 * but it is the thing checkout will hang off, and hashing it now costs one
 * line.
 */

/** Where the token is kept. Read on the server, written by the cart's actions. */
export const CART_COOKIE = "cart";

/** 256 bits, like the admin's. */
const TOKEN_BYTES = 32;

/**
 * How long a cart lasts since it was last added to.
 *
 * Thirty days: long enough that a cart filled on a lunch break is still there
 * at the weekend, short enough that abandoned rows do not pile up for ever. The
 * cookie and the row share it, so neither outlives the other.
 */
export const CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** A fresh token, base64url so it is cookie-safe without escaping. */
export function newCartToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/** What `carts.token_hash` holds for a token. */
export function hashCartToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * The cookie's options.
 *
 * Each is the currency cookie's choice for the reason given there
 * (`app/[lang]/currency-actions.ts`) — `httpOnly`, `secure` only in
 * production, and `lax` so the cart survives a link opened in a new tab — and
 * `httpOnly` matters more here: this cookie is a credential for a cart, not a
 * preference.
 */
export const CART_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: CART_TTL_MS / 1000,
} as const;
