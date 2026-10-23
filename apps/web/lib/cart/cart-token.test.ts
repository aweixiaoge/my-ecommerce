import { describe, expect, it } from "vitest";
import { CART_COOKIE_OPTIONS, CART_TTL_MS, hashCartToken, newCartToken } from "./cart-token";

describe("cart tokens", () => {
  it("mints a different, cookie-safe token every time", () => {
    const a = newCartToken();
    const b = newCartToken();

    expect(a).not.toBe(b);
    // base64url of 32 bytes: 43 characters, none that need escaping in a cookie.
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("stores a hash that is stable and is not the token", () => {
    const token = newCartToken();

    expect(hashCartToken(token)).toBe(hashCartToken(token));
    expect(hashCartToken(token)).not.toContain(token);
    expect(hashCartToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps the cookie no longer than the row", () => {
    expect(CART_COOKIE_OPTIONS.maxAge * 1000).toBe(CART_TTL_MS);
    expect(CART_COOKIE_OPTIONS.httpOnly).toBe(true);
  });
});
