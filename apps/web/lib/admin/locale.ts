/**
 * The language the first content is written in.
 *
 * plan.md makes multi-language a schema decision and deliberately leaves the
 * feature late (Phase 8), and never names a first locale. No admin form has a
 * locale picker, so this is the one place that decides — here, rather than
 * inside the shared payloads, for the same reason `APP_CURRENCY` lives on the
 * app side: a default baked into the contract is a default every consumer
 * inherits, and a market's choice belongs to the market.
 *
 * Its own module rather than a constant in one screen's helper file: every
 * entity's translations are filtered and written by this locale, so a second
 * entity importing it from the first's file would be a dependency between two
 * things that have nothing to do with each other.
 */
export const DEFAULT_LOCALE = "en";
