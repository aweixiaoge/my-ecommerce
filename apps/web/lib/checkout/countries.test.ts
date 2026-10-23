import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addressProblems,
  countryName,
  countryOptions,
  DEFAULT_COUNTRY,
  isShippingCountry,
  regionsFor,
  SHIPPING_COUNTRIES,
} from "./countries";

describe("countryOptions", () => {
  it("names every country in the reader's language, alphabetically", () => {
    const english = countryOptions("en");
    const german = countryOptions("de");

    expect(english).toHaveLength(SHIPPING_COUNTRIES.length);
    expect(english.find((country) => country.code === "DE")?.name).toBe("Germany");
    expect(german.find((country) => country.code === "DE")?.name).toBe("Deutschland");
    const names = english.map((country) => country.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("opens on the design's China", () => {
    expect(DEFAULT_COUNTRY).toBe("CN");
    expect(countryName("CN", "fr")).toBe("Chine");
  });
});

describe("a code Intl has no name for", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps its code, which is honest and still selectable", () => {
    // A `function`, not an arrow: the code under test calls it with `new`.
    vi.spyOn(Intl, "DisplayNames").mockImplementation(function () {
      return { of: () => undefined } as unknown as Intl.DisplayNames;
    });

    expect(countryName("CN", "en")).toBe("CN");
    expect(countryOptions("en").find((country) => country.code === "CN")?.name).toBe("CN");
  });
});

describe("regionsFor", () => {
  it("lists China's provinces, America's states and Canada's provinces", () => {
    expect(regionsFor("CN")?.label).toBe("province");
    expect(regionsFor("CN")?.names).toContain("Guangdong");
    expect(regionsFor("CN")?.names).toHaveLength(31);
    expect(regionsFor("US")?.label).toBe("state");
    expect(regionsFor("CA")?.names).toContain("Quebec");
  });

  it("has no list where the box is free text, or for a country not shipped to", () => {
    expect(regionsFor("DE")).toBeNull();
    expect(regionsFor("ZZ")).toBeNull();
  });
});

describe("addressProblems", () => {
  it("accepts a listed region, and an absent one where there is no list", () => {
    expect(addressProblems({ countryCode: "CN", region: "Shanghai" })).toEqual([]);
    expect(addressProblems({ countryCode: "DE", region: undefined })).toEqual([]);
    expect(addressProblems({ countryCode: "DE", region: "Berlin" })).toEqual([]);
  });

  it("refuses a country the shop does not ship to", () => {
    expect(isShippingCountry("BR")).toBe(false);
    expect(addressProblems({ countryCode: "BR", region: undefined })).toEqual(["countryCode"]);
  });

  it("refuses a missing province, and one from another country's list", () => {
    expect(addressProblems({ countryCode: "CN", region: undefined })).toEqual(["region"]);
    expect(addressProblems({ countryCode: "CN", region: "Ontario" })).toEqual(["region"]);
  });
});
