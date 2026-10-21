import { DEFAULT_LOCALE } from "../locale";

/**
 * Which translation of a row is shown, and which locales a read has to fetch
 * to have a choice.
 *
 * The storefront is served in five languages and the catalogue holds rows for
 * one of them, so every read that selects `(entity_id, locale)` rows selects
 * two: the language of the URL, and the default language behind it. Between
 * them these two functions are the whole of the fallback policy — a product
 * with no German row shows its English name rather than vanishing from the
 * grid, which is what it did when the query filtered to one language.
 *
 * They are here rather than in each mapper because eight mappers each deciding
 * it is eight places for a page to disappear. Nothing else in the app decides
 * it: a mapper that cannot find either translation answers `null`/`""`, and
 * that is the only state with nothing to show.
 */

/**
 * The locales a read fetches: the page's language, and the default behind it.
 *
 * One entry when they are the same — English asks for English, not for itself
 * twice. The order is the preference order `shownTranslation` reads.
 */
export function fallbackLocales(locale: string): string[] {
  return locale === DEFAULT_LOCALE ? [locale] : [locale, DEFAULT_LOCALE];
}

/**
 * The translation to show: the page's language when the row has one, the
 * default when it does not.
 *
 * `at(0)` as the fallback rather than a second lookup by name is not a
 * shortcut: the queries that feed this filter to exactly the locales
 * `fallbackLocales` returns, so when the requested one is absent the remaining
 * row — if there is one at all — is the default.
 */
export function shownTranslation<T extends { locale: string }>(
  translations: readonly T[],
  locale: string,
): T | undefined {
  return (
    translations.find((translation) => translation.locale === locale) ??
    translations.at(0)
  );
}
