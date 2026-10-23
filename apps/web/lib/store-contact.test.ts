import { describe, expect, it } from "vitest";
import { socialLinks, telHref, whatsappHref } from "./store-contact";

const none = {
  phone: null,
  email: null,
  whatsapp: null,
  address: null,
  facebookUrl: null,
  instagramUrl: null,
  youtubeUrl: null,
};

describe("telHref", () => {
  it("keeps only the digits and the plus", () => {
    expect(telHref("+1 (234) 567-890")).toBe("tel:+1234567890");
  });
});

describe("whatsappHref", () => {
  it("drops the international 00 prefix and every separator", () => {
    expect(whatsappHref("0086-18823456748")).toBe("https://wa.me/8618823456748");
  });

  it("treats a + prefix the same as 00", () => {
    expect(whatsappHref("+86 188 2345 6748")).toBe("https://wa.me/8618823456748");
  });
});

describe("socialLinks", () => {
  it("lists only the networks with a link, in the design's order", () => {
    expect(
      socialLinks({ ...none, youtubeUrl: "https://youtube.com/@shop", facebookUrl: "https://facebook.com/shop" }),
    ).toEqual([
      { label: "Facebook", src: "/icons/social-facebook.svg", href: "https://facebook.com/shop" },
      { label: "YouTube", src: "/icons/social-youtube.svg", href: "https://youtube.com/@shop" },
    ]);
  });

  it("is empty when the shop has no profiles", () => {
    expect(socialLinks(none)).toEqual([]);
  });
});
