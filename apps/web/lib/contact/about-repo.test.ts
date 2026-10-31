import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAboutForEdit, getAboutPage, saveAbout, UnknownAboutMediaError } from "./about-repo";

/** The About page's reads and writes, against a stand-in for the database. */
const db = vi.hoisted(() => {
  const tx = {
    aboutTranslation: { upsert: vi.fn() },
    media: { updateMany: vi.fn(), deleteMany: vi.fn() },
  };
  return {
    tx,
    aboutTranslation: { findMany: vi.fn(), findUnique: vi.fn() },
    media: { findMany: vi.fn() },
    $transaction: vi.fn(async (run: (client: typeof tx) => unknown) => run(tx)),
  };
});

vi.mock("@my-ecommerce/db", () => ({
  prisma: { aboutTranslation: db.aboutTranslation, media: db.media, $transaction: db.$transaction },
}));

beforeEach(() => {
  vi.clearAllMocks();
  // One photograph and one clip: which is which comes from the stored type,
  // and an untyped row — written before the column was filled — is a photo.
  db.media.findMany.mockResolvedValue([
    { id: "img_main", mimeType: null },
    { id: "img_2", mimeType: "video/mp4" },
  ]);
  db.tx.media.updateMany.mockResolvedValue({ count: 1 });
});

describe("getAboutPage", () => {
  it("shows the reader's language, and the images and videos in their order", async () => {
    db.aboutTranslation.findMany.mockResolvedValue([
      { locale: "en", description: "English" },
      { locale: "de", description: "Deutsch" },
    ]);

    expect(await getAboutPage("de")).toEqual({
      description: "Deutsch",
      imageIds: ["img_main", "img_2"],
      videoIds: ["img_2"],
    });
    expect(db.aboutTranslation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { locale: { in: ["de", "en"] } } }),
    );
    expect(db.media.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { aboutPage: true },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      }),
    );
  });

  it("falls back to English, and to nothing when nothing is written", async () => {
    db.aboutTranslation.findMany.mockResolvedValue([{ locale: "en", description: "English" }]);
    expect((await getAboutPage("fr")).description).toBe("English");

    db.aboutTranslation.findMany.mockResolvedValue([]);
    expect((await getAboutPage("fr")).description).toBe("");
  });
});

describe("getAboutForEdit", () => {
  it("reads the English and the images", async () => {
    db.aboutTranslation.findUnique.mockResolvedValue({ description: "## Who we are" });

    expect(await getAboutForEdit()).toEqual({
      description: "## Who we are",
      mediaIds: ["img_main", "img_2"],
      videoIds: ["img_2"],
    });
    expect(db.aboutTranslation.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { locale: "en" } }),
    );
  });

  it("starts empty before anything is saved", async () => {
    db.aboutTranslation.findUnique.mockResolvedValue(null);
    db.media.findMany.mockResolvedValue([]);

    expect(await getAboutForEdit()).toEqual({ description: "", mediaIds: [], videoIds: [] });
  });
});

describe("saveAbout", () => {
  it("writes the English as a person's, claims the images in order, and drops the rest", async () => {
    await saveAbout({ description: "## Who we are", mediaIds: ["img_b", "img_a"] });

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.tx.aboutTranslation.upsert).toHaveBeenCalledWith({
      where: { locale: "en" },
      create: { locale: "en", description: "## Who we are", autoTranslated: false },
      update: { description: "## Who we are", autoTranslated: false },
    });
    expect(db.tx.media.updateMany.mock.calls.map(([args]) => args)).toEqual([
      {
        where: {
          id: "img_b",
          OR: [{ aboutPage: true }, { productId: null, variantId: null, blogId: null }],
        },
        data: { aboutPage: true, position: 0 },
      },
      {
        where: {
          id: "img_a",
          OR: [{ aboutPage: true }, { productId: null, variantId: null, blogId: null }],
        },
        data: { aboutPage: true, position: 1 },
      },
    ]);
    expect(db.tx.media.deleteMany).toHaveBeenCalledWith({
      where: { aboutPage: true, id: { notIn: ["img_b", "img_a"] } },
    });
  });

  it("removes every image when the list is emptied", async () => {
    await saveAbout({ description: "", mediaIds: [] });

    expect(db.tx.media.updateMany).not.toHaveBeenCalled();
    expect(db.tx.media.deleteMany).toHaveBeenCalledWith({
      where: { aboutPage: true, id: { notIn: [] } },
    });
  });

  it("refuses an id it may not claim, before anything is deleted", async () => {
    db.tx.media.updateMany.mockResolvedValue({ count: 0 });

    await expect(saveAbout({ description: "", mediaIds: ["product_photo"] })).rejects.toBeInstanceOf(
      UnknownAboutMediaError,
    );
    expect(db.tx.media.deleteMany).not.toHaveBeenCalled();
  });
});
