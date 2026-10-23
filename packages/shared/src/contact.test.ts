import { describe, expect, it } from "vitest";
import {
  CONTACT_MESSAGE_MAX,
  ContactMessageSchema,
  FAQ_DESCRIPTION_MAX,
  FaqSchema,
  StoreContactSchema,
} from "./contact";

const issuesAt = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  (result.error?.issues ?? []).map((issue) => issue.path.join("."));

describe("ContactMessageSchema", () => {
  it("trims every box and folds the email", () => {
    const result = ContactMessageSchema.parse({
      name: "  Ada ",
      email: " Ada@Example.COM ",
      subject: " Sizing ",
      message: "  Which pair?  ",
    });

    expect(result).toEqual({
      name: "Ada",
      email: "ada@example.com",
      subject: "Sizing",
      message: "Which pair?",
    });
  });

  it("stores an empty or blank subject as no subject", () => {
    for (const subject of ["", "   ", undefined]) {
      const result = ContactMessageSchema.parse({ name: "Ada", email: "a@b.co", subject, message: "Hi" });
      expect(result.subject).toBeUndefined();
    }
  });

  it("refuses blank required boxes and a malformed email, naming each", () => {
    const result = ContactMessageSchema.safeParse({
      name: "   ",
      email: "not-an-email",
      subject: "",
      message: " ",
    });

    expect(issuesAt(result).sort()).toEqual(["email", "message", "name"]);
  });

  it("accepts a message at the ceiling and refuses one past it", () => {
    const at = { name: "Ada", email: "a@b.co", message: "x".repeat(CONTACT_MESSAGE_MAX) };

    expect(ContactMessageSchema.safeParse(at).success).toBe(true);
    expect(issuesAt(ContactMessageSchema.safeParse({ ...at, message: `${at.message}x` }))).toEqual([
      "message",
    ]);
  });
});

describe("StoreContactSchema", () => {
  const blank = {
    phone: "",
    email: "",
    whatsapp: "",
    address: "",
    facebookUrl: "",
    instagramUrl: "",
    youtubeUrl: "",
  };

  it("turns every empty or blank field into null", () => {
    expect(StoreContactSchema.parse({ ...blank, phone: "   " })).toEqual({
      phone: null,
      email: null,
      whatsapp: null,
      address: null,
      facebookUrl: null,
      instagramUrl: null,
      youtubeUrl: null,
    });
  });

  it("trims values and folds the email", () => {
    const result = StoreContactSchema.parse({
      ...blank,
      phone: " +1 234 ",
      email: " Info@Shop.COM ",
      facebookUrl: " https://facebook.com/shop ",
    });

    expect(result).toMatchObject({
      phone: "+1 234",
      email: "info@shop.com",
      facebookUrl: "https://facebook.com/shop",
    });
  });

  it("refuses a malformed email and links that are not http(s), naming each", () => {
    const result = StoreContactSchema.safeParse({
      ...blank,
      email: "not-an-email",
      facebookUrl: "javascript:alert(1)",
      instagramUrl: "instagram.com/shop",
      youtubeUrl: "http://youtube.com/@shop",
    });

    expect(issuesAt(result).sort()).toEqual(["email", "facebookUrl", "instagramUrl"]);
  });

  it("refuses an over-long field", () => {
    expect(issuesAt(StoreContactSchema.safeParse({ ...blank, address: "x".repeat(201) }))).toEqual([
      "address",
    ]);
  });
});

describe("FaqSchema", () => {
  it("accepts an empty description — that is how the page is emptied", () => {
    expect(FaqSchema.parse({ description: "" })).toEqual({ description: "" });
  });

  it("keeps the markdown exactly as written", () => {
    const description = "## Shipping\n\n  - **Fast**\n";
    expect(FaqSchema.parse({ description }).description).toBe(description);
  });

  it("refuses a description past the ceiling", () => {
    expect(issuesAt(FaqSchema.safeParse({ description: "x".repeat(FAQ_DESCRIPTION_MAX + 1) }))).toEqual([
      "description",
    ]);
  });
});
