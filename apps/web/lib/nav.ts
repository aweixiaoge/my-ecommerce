import type { Messages } from "@/lib/i18n/messages";

/**
 * The primary navigation, shared by the header and the footer.
 *
 * Routes and their order come from the design's Header (178:8787) and Footer
 * (178:8857) components, which carry the same seven items.
 *
 * A `key` rather than a label, because the same seven items are rendered in
 * five languages: the header and the footer look the label up in the catalog
 * for the locale the request carried, and `Messages["nav"]` is what makes a
 * route without a translation a typecheck failure rather than a blank link.
 *
 * The `href`s are paths *without* a language — `/shop`, not `/de/shop`. They go
 * through `localePath` at the point of use, so this list stays the list of
 * routes rather than a list of one language's URLs.
 *
 * `prefetch: false` marks the routes that do not exist yet: Next prefetches
 * eagerly, and five prefetches against unbuilt routes produce five 404s in the
 * console on every page load, burying real errors. `/shop` no longer carries
 * it — that route is built. Remove the flag from each as its route lands, and
 * note that a link that *does* prefetch is the point of the flag rather than an
 * oversight.
 */
export const NAV = [
  { key: "home", href: "/", prefetch: true },
  { key: "shop", href: "/shop", prefetch: true },
  { key: "about", href: "/about", prefetch: false },
  { key: "journal", href: "/journal", prefetch: false },
  { key: "contact", href: "/contact", prefetch: false },
  { key: "faq", href: "/faq", prefetch: false },
  { key: "account", href: "/account", prefetch: false },
] as const satisfies ReadonlyArray<{
  key: keyof Messages["nav"];
  href: string;
  prefetch: boolean;
}>;
