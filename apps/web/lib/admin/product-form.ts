import { AttributeKindSchema, type AttributeKind } from "@my-ecommerce/shared";

/**
 * The create form's state, and the two conversions between it and the payload.
 *
 * The form holds what is in the input boxes, which is not what gets submitted:
 * values are typed as one comma-separated string and only become a list on the
 * way out, and an attribute nobody filled in is not submitted at all. Both of
 * those are decisions rather than formatting, which is why they live here
 * rather than in the component — where vitest can reach them.
 */

/** What a person sees for each kind. UI copy, so it is not in the shared schema. */
export const ATTRIBUTE_LABELS: Record<AttributeKind, string> = {
  color: "Color",
  size: "Size",
};

/**
 * Example values for the empty box, per kind: "S, M, L" under a Size row and
 * "Black, Sand" under a Color one. One shared example teaches half the form
 * the wrong shape.
 */
export const ATTRIBUTE_PLACEHOLDERS: Record<AttributeKind, string> = {
  color: "Black, Sand",
  size: "S, M, L",
};

const ATTRIBUTE_KINDS: readonly AttributeKind[] = AttributeKindSchema.options;

export interface FormAttribute {
  kind: AttributeKind;
  /** As typed: "S, M, L" is three values, and a trailing comma is not an error. */
  values: string;
}

/**
 * Splits a typed value list into the values it names.
 *
 * Commas and newlines both separate, because both are what a paste from a
 * spreadsheet arrives with. Whitespace is trimmed, empty entries are dropped
 * ("S, M," is two values, not three), and duplicates are dropped
 * case-insensitively — "Black" and "black" are one colour, and the schema
 * refuses them, so letting them through here would turn a slip into a form
 * error the person cannot see.
 */
export function parseAttributeValues(raw: string): string[] {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const part of raw.split(/[,\n]/)) {
    const value = part.trim();
    if (value === "") continue;

    const key = value.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    values.push(value);
  }

  return values;
}

/**
 * The payload the server action receives, as JSON for a hidden input.
 *
 * An attribute with no values is left out rather than sent empty: the person
 * added a row and did not fill it in, which means they changed their mind, not
 * that they want an option with nothing in it. An entirely empty list is still
 * sent — `[]` — so the action always sees the field.
 */
export function serializeAttributes(attributes: FormAttribute[]): string {
  return JSON.stringify(
    attributes
      .map((attribute) => ({
        kind: attribute.kind,
        values: parseAttributeValues(attribute.values),
      }))
      .filter((attribute) => attribute.values.length > 0),
  );
}

/**
 * The kinds a row may be, which is every kind no *other* row is using.
 *
 * The schema allows one attribute per kind, so a picker that offered "Size"
 * while a size row exists would be offering a submission it knows will be
 * refused.
 */
export function availableKinds(
  attributes: FormAttribute[],
  current: AttributeKind,
): AttributeKind[] {
  const taken = new Set(
    attributes
      .filter((attribute) => attribute.kind !== current)
      .map((attribute) => attribute.kind),
  );

  return ATTRIBUTE_KINDS.filter((kind) => !taken.has(kind));
}

/**
 * The first kind nothing is using, or null when every kind is spoken for —
 * which is also the condition for the "Attribute" button being available.
 */
export function nextAvailableKind(
  attributes: FormAttribute[],
): AttributeKind | null {
  const taken = new Set(attributes.map((attribute) => attribute.kind));
  return ATTRIBUTE_KINDS.find((kind) => !taken.has(kind)) ?? null;
}
