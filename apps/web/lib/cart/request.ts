import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Cart } from "@my-ecommerce/shared";
import type { Locale } from "@/lib/languages";
import { getCart } from "./cart-repo";
import { CART_COOKIE } from "./cart-token";

/**
 * The cart one request is about.
 *
 * `React.cache` for the reason `requestDisplayCurrency` gives: the header's
 * badge and the cart page both ask, and one request should make one query. It
 * is memoisation within a request, never a lifetime — two shoppers' cookies
 * must never share an answer.
 */
export const requestCart = cache(async (locale: Locale): Promise<Cart | null> => {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return null;

  // Whether a cart has expired is a question about *now*, and with Cache
  // Components the clock may only be read once the render is known to be a
  // request's rather than a prerender's — which is what `connection()` waits
  // for ("blocking-prerender-current-time").
  await connection();

  return getCart(token, locale);
});
