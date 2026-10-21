import { hasLocale, type Locale } from "@/lib/languages";
import { DEFAULT_LOCALE } from "@/lib/locale";

/**
 * Where the language lives in a URL, as three pure functions.
 *
 * A module of its own, with no React and no request in it, because this is the
 * whole of the storefront's locale policy and it is read from both directions:
 * every link the storefront draws goes through `localePath`, and the proxy
 * decides what to do with an incoming path through `localeRedirectFor`. Written
 * inline at either end, "the locale is the first segment" would be two rules
 * the first time one of them changed.
 *
 * The shape is plan.md's and the shared contract's, not a local choice —
 * `packages/shared/src/common.ts` says why: locale is part of the URL because
 * each translation is separate content that search engines must crawl.
 */

/**
 * A storefront path with its language in front: `/shop` in German is
 * `/de/shop`, the home page is `/de`.
 *
 * The path is everything after the locale — a path, not a URL: query strings
 * and fragments ride along untouched, because the locale goes in *front* of
 * them. `path` is expected to start with `/`.
 */
export function localePath(locale: Locale, path: string): string {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/**
 * The same page in another language — what the switcher's rows need.
 *
 * It reads the locale off the path rather than taking it as an argument: the
 * caller is a client component with a `usePathname()` and no idea which
 * language it is currently showing. A path with no locale in front is treated
 * as the default's, which is what a bare path means everywhere else in the app
 * (the proxy is what makes sure a browser never sees one).
 */
export function swapLocale(pathname: string, locale: Locale): string {
  const [, first = "", ...rest] = pathname.split("/");

  return hasLocale(first)
    ? `/${[locale, ...rest].join("/")}`
    : localePath(locale, pathname);
}

/**
 * What the proxy does with an incoming path: where to send it, or `null` when
 * it is already addressed.
 *
 * Every path the proxy sees is a storefront path — the admin, the media route,
 * the framework's own assets and the files in `public/` are excluded by the
 * proxy's matcher, not here — so this has exactly one decision to make: a path
 * that does not start with a locale is sent to the same path under the default
 * one. That covers `/` and it covers `/shop?page=2`, which the proxy appends
 * the query to.
 *
 * A path whose first segment is *not* a locale but *looks* like one — `/xx/shop`
 * — is not special-cased, and should not be: this function cannot know which
 * segments are routes. It redirects to `/en/xx/shop`, which matches no route
 * and 404s, which is the answer the URL deserves.
 */
export function localeRedirectFor(pathname: string): string | null {
  const first = pathname.split("/")[1] ?? "";

  return hasLocale(first) ? null : localePath(DEFAULT_LOCALE, pathname);
}
