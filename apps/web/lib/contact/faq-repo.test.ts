import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEnglishFaqDescription, getFaqDescription, saveEnglishFaqDescription } from "./faq-repo";

/** The FAQ reads and writes, against a stand-in for the database. */
const db = vi.hoisted(() => ({
  faqTranslation: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
}));

vi.mock("@my-ecommerce/db", () => ({ prisma: { faqTranslation: db.faqTranslation } }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getFaqDescription", () => {
  it("asks for the language and English, and shows the language", async () => {
    db.faqTranslation.findMany.mockResolvedValue([
      { locale: "en", description: "English" },
      { locale: "de", description: "Deutsch" },
    ]);

    expect(await getFaqDescription("de")).toBe("Deutsch");
    expect(db.faqTranslation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { locale: { in: ["de", "en"] } } }),
    );
  });

  it("falls back to English where the language has no row", async () => {
    db.faqTranslation.findMany.mockResolvedValue([{ locale: "en", description: "English" }]);

    expect(await getFaqDescription("fr")).toBe("English");
  });

  it("is empty when nothing has been written", async () => {
    db.faqTranslation.findMany.mockResolvedValue([]);

    expect(await getFaqDescription("en")).toBe("");
  });
});

describe("getEnglishFaqDescription", () => {
  it("reads the English row, or nothing", async () => {
    db.faqTranslation.findUnique.mockResolvedValueOnce({ description: "## Q" }).mockResolvedValueOnce(null);

    expect(await getEnglishFaqDescription()).toBe("## Q");
    expect(await getEnglishFaqDescription()).toBe("");
  });
});

describe("saveEnglishFaqDescription", () => {
  it("writes English as a person's row", async () => {
    await saveEnglishFaqDescription("## Q");

    expect(db.faqTranslation.upsert).toHaveBeenCalledWith({
      where: { locale: "en" },
      create: { locale: "en", description: "## Q", autoTranslated: false },
      update: { description: "## Q", autoTranslated: false },
    });
  });
});
