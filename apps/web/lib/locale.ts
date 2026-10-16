/**
 * The language the first content is written in.
 *
 * plan.md makes multi-language a schema decision and deliberately leaves the
 * feature late (Phase 8), and never names a first locale. The admin form has no
 * locale picker, so this is the one place that decides — here, rather than
 * inside the shared payload, for the same reason `APP_CURRENCY` lives on the
 * app side: a default baked into the contract is a default every consumer
 * inherits, and a market's choice belongs to the market.
 *
 * App-level rather than `lib/admin/`, because it is not an admin decision. Both
 * sides of the app read products in this locale — the admin list, and now the
 * storefront's shop — and a constant two readers share cannot live under one of
 * them without the other importing across the boundary.
 */
export const DEFAULT_LOCALE = "en";
