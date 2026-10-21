import { NextResponse, type NextRequest } from "next/server";
import { localeRedirectFor } from "@/lib/i18n/paths";

/**
 * Sends a path with no language in front of it to the default one.
 *
 * This version of Next runs `proxy.ts` where earlier ones ran `middleware.ts`;
 * it is the only place a request can be answered before a route renders. What
 * it does here is one hop — `/shop` becomes `/en/shop`, `/` becomes `/en` — and
 * the decision itself lives in `lib/i18n/paths.ts` as a pure function, so the
 * rule is unit-tested rather than only exercised in a browser.
 *
 * The matcher is what keeps this off the paths that must never be prefixed:
 *
 * - `admin` — the admin has no language in its URL and its own root layout.
 *   Excluding it is safe *because* `app/admin/(shell)/layout.tsx` authenticates
 *   every screen below it; if that check ever moves out of the shell, this
 *   exclusion stops being a redirect rule and starts being the only thing
 *   between a request and the admin.
 * - `media` — the media route is addressed by id from stored content, so its
 *   URLs cannot be rewritten per language.
 * - `_next/*`, and anything with a dot in it — the framework's own assets, and
 *   the files in `public/` (`/icons/cart.svg`, `/images/hero-audio.jpg`), which
 *   are served from the root and are not pages. Without the dot rule they would
 *   be redirected into a locale directory that does not exist.
 */
export function proxy(request: NextRequest) {
  const target = localeRedirectFor(request.nextUrl.pathname);
  if (!target) return;

  const url = request.nextUrl.clone();
  url.pathname = target;

  // 307, not 308: which language is the default is a decision this app can
  // change, and a permanent redirect on every bare URL would leave browsers
  // holding it long after. The English paths are canonical in the app itself —
  // every link the storefront draws goes through `localePath` — so this hop is
  // only ever taken by an old link or a typed URL.
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: [
    "/((?!admin|media|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
