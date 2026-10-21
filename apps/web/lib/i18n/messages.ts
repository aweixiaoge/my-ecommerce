import type { Locale } from "@/lib/languages";
import { de } from "./messages/de";
import { en } from "./messages/en";
import { es } from "./messages/es";
import { fr } from "./messages/fr";
import { pt } from "./messages/pt";

/**
 * The catalog for a language.
 *
 * `Messages` is derived from the English file rather than declared, which is
 * what makes the other four catalogs checked rather than trusted: each is
 * written `satisfies Messages`, so a key the English one has and they do not is
 * a typecheck failure on the catalog, at the key, in the file that is missing
 * it. Adding a string to a page means adding it to `en.ts` first — which is the
 * point, because a string that exists only in one language is invisible until
 * somebody reads the site in another.
 *
 * The record is total over `Locale`: a language in `lib/languages.ts` with no
 * catalog here does not compile, so the switcher cannot offer something the
 * server cannot render.
 *
 * Server-side only. Client components receive the slice of the catalog they
 * need as a prop — this module imports every language, and a client bundle
 * should carry one. `import type { Messages }` is the exception: it is erased
 * at build time.
 */
export type Messages = typeof en;

const CATALOGS: Record<Locale, Messages> = { en, de, fr, pt, es };

export function getMessages(locale: Locale): Messages {
  return CATALOGS[locale];
}
