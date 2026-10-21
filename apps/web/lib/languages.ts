/**
 * The languages the storefront is served in — the one list everything else
 * reads.
 *
 * The names and their order come from the design's `Dropdown Menu - Language`
 * (Figma 180:1866), which draws the open state of the header's `Link -
 * Language` (179:1818). The design names three — English, Deutsch, Français —
 * and the two below extend that list in the same form: each language written
 * in its own tongue, with the default first, which is how the design lists its
 * three.
 *
 * `code` is both the URL segment (`/de/...`) and the Intl locale the app
 * formats money and dates with, and it is what the closed switcher shows,
 * uppercased — the design reads `EN`, not `English`.
 *
 * One list, because four things have to agree and none of them can see the
 * others' copy: the routes (`app/[lang]` and its `generateStaticParams`), the
 * proxy that decides what the first path segment may be, the message catalogs
 * (`lib/i18n/messages.ts` is keyed by `Locale`, so a language without a
 * catalog does not compile), and the switcher.
 *
 * `Locale` is the union of the codes rather than `string`, which is what makes
 * `hasLocale` a narrowing guard: every reader of the URL segment starts from
 * `string | undefined` and has to prove it holds one of these.
 */
export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
] as const satisfies ReadonlyArray<{ code: string; label: string }>;

export type Language = (typeof LANGUAGES)[number];

/** A language the storefront is served in, e.g. `"en"`. */
export type Locale = Language["code"];

/** Every locale, as a plain array — what `generateStaticParams` and the proxy
 *  iterate. Typed as `Locale[]` rather than the readonly literal tuple so it
 *  composes with ordinary array code. */
export const LOCALES: readonly Locale[] = LANGUAGES.map(
  (language) => language.code,
);

/**
 * Whether a URL segment names a language this storefront is served in.
 *
 * A guard rather than a boolean test: the segment arrives as `string`, and
 * everything downstream — the message lookup above all — is keyed by `Locale`.
 */
export function hasLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}
