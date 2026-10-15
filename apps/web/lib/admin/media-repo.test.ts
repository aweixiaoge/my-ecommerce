import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMedia, putMedia } from "./media-repo";

/**
 * The media store, against a stand-in for the database — the same reasoning as
 * `products-repo.test.ts`: the unit lane has no external services, so what is
 * testable here is the handling around the query rather than the query.
 */
const db = vi.hoisted(() => ({
  media: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
}));

vi.mock("@my-ecommerce/db", () => ({
  prisma: {
    media: db.media,
    $transaction: (run: (tx: unknown) => unknown) => run(db),
  },
}));

const bytes = (text: string) =>
  new TextEncoder().encode(text) as Uint8Array<ArrayBuffer>;

beforeEach(() => {
  vi.clearAllMocks();
  db.media.create.mockResolvedValue({ id: "media_1" });
  db.media.update.mockResolvedValue({});
  db.media.findUnique.mockResolvedValue(null);
});

describe("putMedia", () => {
  it("stores the bytes and the validated type", async () => {
    await putMedia({ bytes: bytes("image"), type: "image/png" });

    const [call] = db.media.create.mock.calls;
    const fields = (call[0] as { data: { url: string; data: Uint8Array; mimeType: string } })
      .data;

    expect(fields.url).toBe("");
    expect(fields.mimeType).toBe("image/png");
    // Byte for byte, not "some Uint8Array": the whole point of the column is
    // that what comes back out is what went in.
    expect(new TextDecoder().decode(fields.data)).toBe("image");
  });

  it("returns the URL the id resolves to, and stores it on the row", async () => {
    // The id is the database's to mint, so the URL can only be filled in after
    // the insert — which is what the second statement in the transaction is.
    const media = await putMedia({ bytes: bytes("image"), type: "image/png" });

    expect(media).toEqual({ id: "media_1", url: "/admin/media/media_1" });
    expect(db.media.update).toHaveBeenCalledWith({
      where: { id: "media_1" },
      data: { url: "/admin/media/media_1" },
    });
  });
});

describe("getMedia", () => {
  it("serves back what was stored, byte for byte", async () => {
    db.media.findUnique.mockResolvedValue({
      data: bytes("the image"),
      mimeType: "image/jpeg",
    });

    const media = await getMedia("media_1");

    expect(media?.type).toBe("image/jpeg");
    expect(new TextDecoder().decode(media?.bytes)).toBe("the image");
  });

  it("answers null for an id that names nothing", async () => {
    // A deleted image and a made-up one are the same answer: the route handler
    // turns this into a 404 either way.
    expect(await getMedia("media_999")).toBeNull();
  });

  it("treats a row with no bytes as missing", async () => {
    db.media.findUnique.mockResolvedValue({ data: null, mimeType: "image/png" });

    expect(await getMedia("media_1")).toBeNull();
  });

  it("treats a row with no type as missing rather than serving it unlabelled", async () => {
    // Without a type the browser sniffs the bytes and decides for itself what
    // they are, which is the thing `nosniff` on the response exists to stop.
    db.media.findUnique.mockResolvedValue({
      data: bytes("image"),
      mimeType: null,
    });

    expect(await getMedia("media_1")).toBeNull();
  });
});
