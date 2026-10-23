/**
 * Filling a message in, and choosing its form.
 *
 * Two functions and no catalog, in a module of their own because client
 * components need them: a client component is handed the messages it renders
 * as a prop — catalogs are server-side, and shipping five of them to the
 * browser to use one would be four languages' worth of bundle nobody asked
 * for — but it still has to put a number into a sentence.
 */

/**
 * Replaces `{name}` placeholders with values.
 *
 * A placeholder with no value is left as it stands rather than becoming
 * `undefined`: a missing value is a bug in the call, and a sentence with
 * `{count}` in it says so where the alternative hides it. No escaping and no
 * nesting — the values are numbers and counts, not markup.
 */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    key in values ? String(values[key]) : placeholder,
  );
}

/**
 * `fill` for a sentence with markup in it: the values may be elements, and the
 * result is the sentence as a list of pieces for React to render in order.
 *
 * The catalog keeps the whole sentence — "Hello {email} (not {email}? {logOut})"
 * — so a language can move the link or the bold name to wherever its grammar
 * puts them. Splitting it into fragments in the catalog would fix the English
 * word order into every language. A placeholder with no value is left as
 * text, as `fill` leaves it.
 */
export function fillParts<T>(template: string, values: Record<string, T>): (string | T)[] {
  const parts: (string | T)[] = [];
  let last = 0;

  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    const key = match[1]!;
    if (!(key in values)) continue;
    if (match.index > last) parts.push(template.slice(last, match.index));
    parts.push(values[key]!);
    last = match.index + match[0].length;
  }

  if (last < template.length) parts.push(template.slice(last));
  return parts;
}

/**
 * The form for a count, filled in: `{ one, other }` plus the number.
 *
 * Two forms rather than a plural-rules library, and that is a measurement
 * rather than a shortcut: every language this storefront is served in —
 * English, German, French, Portuguese, Spanish — divides at exactly one. A
 * language whose grammar needed more would need more here, and this is the one
 * place that would change.
 *
 * `{count}` is filled for the caller, because a plural form without its number
 * is not a sentence.
 */
export function plural(
  value: number,
  forms: { one: string; other: string },
  values: Record<string, string | number> = {},
): string {
  return fill(value === 1 ? forms.one : forms.other, {
    count: value,
    ...values,
  });
}
