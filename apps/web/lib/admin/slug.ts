/**
 * A product name, as a URL.
 *
 * The create form has no slug field, and the database has a `(locale, slug)`
 * unique constraint (plan.md, decision 2: one slug per locale, unique within a
 * locale). So one is made from the name here rather than left to the database
 * to invent.
 *
 * The form of the transformation is deliberate and narrow: lowercase, ASCII
 * letters and digits, single dashes between them. Anything else — punctuation,
 * accents, a script with no ASCII at all — is a character a URL can either
 * escape or drop, and a slug that needs escaping is not doing its job.
 */

/**
 * A name that slugs to nothing still needs a slug.
 *
 * "日本語" and "!!!" both reduce to the empty string. The unique constraint
 * means two of them would collide, so an empty result falls back to a word
 * rather than to nothing — and `slugAttempt` is what keeps the fallback shared
 * rather than duplicated.
 */
const FALLBACK = "product";

export function slugify(name: string): string {
  const slug = name
    // Accents come off first, before anything else is dropped: "Café" should be
    // "cafe", not "caf". NFKD splits an accented character into a base letter
    // and a combining mark, and `\p{M}` — the Unicode "mark" category — is what
    // removes them. A property escape rather than a code-point range because a
    // range of invisible characters in a source file is a range nobody can
    // read, review, or notice the edges of.
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug === "" ? FALLBACK : slug;
}

/**
 * The nth attempt at a slug, for when the obvious one is taken.
 *
 * Attempt 1 is the slug itself and attempt 2 is `-2`, so the first two products
 * called "Studio Over-Ear" are `studio-over-ear` and `studio-over-ear-2` —
 * numbering that starts where a person would start it.
 */
export function slugAttempt(base: string, attempt: number): string {
  return attempt === 1 ? base : `${base}-${attempt}`;
}

/**
 * How many times to try before giving up.
 *
 * Not a limit anybody should reach: it advances only when a product with the
 * same name already exists in the same locale, so the hundredth "Studio
 * Over-Ear" is `studio-over-ear-100`. The point of a bound is that a loop
 * against a database has one.
 */
export const SLUG_ATTEMPTS = 100;
