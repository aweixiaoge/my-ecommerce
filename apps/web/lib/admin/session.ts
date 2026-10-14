import { cookies } from "next/headers";
import {
  createSessionToken,
  destroySessionToken,
  verifySessionToken,
} from "./session-store";

/**
 * The admin session cookie.
 *
 * A different cookie from the customer session, always (plan.md, decision 6):
 * the two identities never share a token, so a customer cookie cannot be
 * presented as an admin one and no bug in the storefront's auth can promote
 * anyone.
 *
 * Every function here is cookie plumbing over `session-store`. The decisions —
 * hashing, expiry, invalidation — live there, where they can be tested without
 * a request context.
 */

const COOKIE_NAME = "admin_session";

/**
 * Must be called from a Server Action or Route Handler: HTTP cannot set cookies
 * once the response has started streaming, and Server Component rendering is
 * exactly that.
 */
export async function createSession(adminId: string): Promise<void> {
  const { token, expiresAt } = createSessionToken(adminId);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    // Required in production, and skipped outside it on purpose.
    //
    // `secure: true` over plain http is a silent failure: the browser drops the
    // cookie, `createSession` looks like it worked, the redirect to /admin runs,
    // `getSession` finds nothing, and the visitor lands back on the sign-in page
    // with no error anywhere. Chrome and Firefox treat http://localhost as a
    // secure context and would hide that; Safari does not, and neither does any
    // browser on a LAN address such as http://192.168.1.10:3000 — which is
    // exactly how you would check the admin on a phone.
    //
    // Production is always https, so the flag is always on where it matters.
    secure: process.env.NODE_ENV === "production",
    // "lax" rather than "strict": strict drops the cookie on any inbound
    // top-level navigation, so a bookmarked /admin link would land on the
    // login page with a perfectly good session sitting in the browser.
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

/** The signed-in admin's id, or null. Safe to call from Server Components. */
export async function getSession(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySessionToken(token);
}

/** Sign-out. Clears the cookie and invalidates the token server-side. */
export async function deleteSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;

  // Invalidating server-side is the part that matters: deleting the cookie
  // alone would leave a working token for anyone who had already copied it,
  // and the browser would happily send it again if the delete ever failed.
  if (token) destroySessionToken(token);

  store.delete(COOKIE_NAME);
}
