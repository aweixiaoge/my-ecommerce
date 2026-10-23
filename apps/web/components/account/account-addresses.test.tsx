import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { en } from "@/lib/i18n/messages/en";
import { AccountAddresses } from "./account-addresses";

const shenzhen = {
  countryCode: "CN",
  firstName: "John",
  lastName: "Michelad",
  line1: "Building 14, Dongbian New Village 2, Minzhi Street",
  line2: undefined,
  city: "Shenzhen",
  region: "Guangdong",
  postalCode: "518000",
  phone: "+86 755 0000 0000",
};

const render = (book: Parameters<typeof AccountAddresses>[0]["book"], locale: "en" | "de" = "en") =>
  new DOMParser().parseFromString(
    renderToStaticMarkup(<AccountAddresses book={book} locale={locale} messages={en.account} />),
    "text/html",
  );

describe("AccountAddresses", () => {
  it("writes a saved address as the design's three lines, without the shop's own country or the phone", () => {
    const page = render({ billing: shenzhen, shipping: null });
    const lines = [...page.querySelectorAll("section")[0]!.querySelectorAll("address > span")].map(
      (line) => line.textContent,
    );

    expect(lines).toEqual([
      "John Michelad",
      "Building 14, Dongbian New Village 2, Minzhi Street",
      "Shenzhen, Guangdong 518000",
    ]);
  });

  it("names the country when it is not the shop's", () => {
    const page = render({ billing: { ...shenzhen, countryCode: "DE", region: undefined, city: "Berlin" }, shipping: null });

    expect(page.querySelector("address")!.textContent).toContain("Germany");
  });

  it("offers to edit a saved address and to add a missing one, each at its own address", () => {
    const page = render({ billing: shenzhen, shipping: null }, "de");
    const links = [...page.querySelectorAll("section header a")].map((link) => [
      link.textContent,
      link.getAttribute("href"),
    ]);

    expect(links).toEqual([
      ["Edit Billing address", "/de/account/addresses/billing"],
      ["Add Shipping address", "/de/account/addresses/shipping"],
    ]);
    expect(page.querySelectorAll("section")[1]!.textContent).toContain(
      "You have not set up this type of address yet.",
    );
  });
});
