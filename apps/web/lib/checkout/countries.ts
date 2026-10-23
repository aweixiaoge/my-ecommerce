import type { Address } from "@my-ecommerce/shared";

/**
 * Where the shop ships, and how an address is written in each place.
 *
 * Pure data and pure functions, because both sides of the boundary read it:
 * the checkout form draws the country menu and the province menu from it, and
 * the action checks the submission against the same lists — a country the menu
 * never offered is a tampered form, not an address.
 *
 * Country *names* are not here. `Intl.DisplayNames` writes "China", "Chine" and
 * "中国" from the code, in whatever language the page is read in, so the list is
 * codes and the catalogs stay out of it.
 */

/**
 * The countries the checkout offers, by ISO 3166-1 alpha-2 code.
 *
 * China first because it is the design's default — the Figma checkout opens on
 * it — and the shop's first market. The order of the menu itself is
 * alphabetical in the reader's language (`countryOptions`).
 */
export const SHIPPING_COUNTRIES = [
  "CN",
  "AT",
  "AU",
  "BE",
  "CA",
  "CH",
  "DE",
  "DK",
  "ES",
  "FR",
  "GB",
  "IE",
  "IT",
  "JP",
  "KR",
  "NL",
  "NZ",
  "PT",
  "SE",
  "SG",
  "US",
] as const;

export type ShippingCountry = (typeof SHIPPING_COUNTRIES)[number];

/** What the checkout opens on: the design's, and the first market. */
export const DEFAULT_COUNTRY: ShippingCountry = "CN";

/**
 * The countries whose addresses need a province or state, and the list to
 * choose it from. Anywhere else the field is an optional box.
 *
 * The names are written in English, the way a carrier reads them; they are
 * proper nouns rather than copy, which is why they are not in a catalog.
 * China's list is the 31 province-level divisions of the mainland.
 */
const REGIONS: Partial<Record<ShippingCountry, { label: RegionLabel; names: readonly string[] }>> = {
  CN: {
    label: "province",
    names: [
      "Anhui", "Beijing", "Chongqing", "Fujian", "Gansu", "Guangdong", "Guangxi",
      "Guizhou", "Hainan", "Hebei", "Heilongjiang", "Henan", "Hubei", "Hunan",
      "Inner Mongolia", "Jiangsu", "Jiangxi", "Jilin", "Liaoning", "Ningxia",
      "Qinghai", "Shaanxi", "Shandong", "Shanghai", "Shanxi", "Sichuan",
      "Tianjin", "Tibet", "Xinjiang", "Yunnan", "Zhejiang",
    ],
  },
  US: {
    label: "state",
    names: [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
      "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia",
      "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
      "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
      "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
      "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
      "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
      "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
      "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
    ],
  },
  CA: {
    label: "province",
    names: [
      "Alberta", "British Columbia", "Manitoba", "New Brunswick",
      "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
      "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
      "Yukon",
    ],
  },
};

/** What a country calls its regions — the catalog key for the field's label. */
export type RegionLabel = "province" | "state";

export function isShippingCountry(code: string): code is ShippingCountry {
  return (SHIPPING_COUNTRIES as readonly string[]).includes(code);
}

/** The province or state list for a country, or null where the box is free text. */
export function regionsFor(code: string): { label: RegionLabel; names: readonly string[] } | null {
  return isShippingCountry(code) ? (REGIONS[code] ?? null) : null;
}

/**
 * The country menu: every code with its name in the reader's language,
 * alphabetical in that language.
 *
 * A code `Intl` has no name for keeps its code, which is honest and still
 * selectable.
 */
export function countryOptions(locale: string): { code: ShippingCountry; name: string }[] {
  const names = new Intl.DisplayNames([locale], { type: "region" });

  return SHIPPING_COUNTRIES.map((code) => ({ code, name: names.of(code) ?? code })).sort(
    (a, b) => a.name.localeCompare(b.name, locale),
  );
}

/** A country's name in the reader's language, for an order's address block. */
export function countryName(code: string, locale: string): string {
  return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
}

/**
 * Which fields of an address the shop's own rules refuse: a country it does
 * not ship to, and a region missing or not on the country's list.
 *
 * The schema has already checked the shape; this is the part only the
 * storefront knows.
 */
export function addressProblems(
  address: Pick<Address, "countryCode" | "region">,
): ("countryCode" | "region")[] {
  if (!isShippingCountry(address.countryCode)) return ["countryCode"];

  const regions = regionsFor(address.countryCode);
  if (regions && !(address.region && regions.names.includes(address.region))) {
    return ["region"];
  }

  return [];
}
