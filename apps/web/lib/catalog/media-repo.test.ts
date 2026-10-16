import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicMedia, publicMediaUrl } from "./media-repo";

/**
 * The storefront's image read, against a stand-in for the database.
 *
 * The question this file exists to answer is not "does it fetch the bytes" —
 * the admin repo already does that and is tested. It is "which bytes may it
 * hand to somebody who is not signed in", and every way the answer could be yes
 * when it should be no is a separate case below.
 */
const db = vi.hoisted(() => ({
  media: { findUnique: vi.fn() },
}));

vi.mock("@my-ecommerce/db", () => ({ prisma: { media: db.media } }));

const BYTES = new Uint8Array([1, 2, 3]);

/** A row as the query returns one: bytes, a type, and the product it is on. */
function media(overrides: Record<string, unknown> = {}) {
  return {
    data: BYTES,
    mimeType: "image/png",
    product: { status: "active" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.media.findUnique.mockResolvedValue(media());
});

describe("publicMediaUrl", () => {
  it("points at the route that will actually serve a shopper", () => {
    expect(publicMediaUrl("media_01")).toBe("/media/media_01");
  });
});

describe("getPublicMedia", () => {
  it("serves a published product's photograph", async () => {
    const result = await getPublicMedia("media_1");

    expect(Array.from(result!.bytes)).toEqual([1, 2, 3]);
    expect(result!.type).toBe("image/png");
  });

  it("asks for the bytes, the type and the product's status, in one read", async () => {
    await getPublicMedia("media_1");

    expect(db.media.findUnique).toHaveBeenCalledWith({
      where: { id: "media_1" },
      select: {
        data: true,
        mimeType: true,
        product: { select: { status: true } },
      },
    });
  });

  it("answers nothing for an id that names no row", async () => {
    db.media.findUnique.mockResolvedValue(null);

    expect(await getPublicMedia("nope")).toBeNull();
  });

  it("answers nothing for a draft product's photograph", async () => {
    // Unpublished work is not the shop's to show, and the answer is the same
    // 404 an unknown id gets — a different one would confirm to anyone willing
    // to guess a cuid that the product exists.
    db.media.findUnique.mockResolvedValue(media({ product: { status: "draft" } }));

    expect(await getPublicMedia("media_1")).toBeNull();
  });

  it("answers nothing for an archived product's photograph", async () => {
    // Archived is off the shelf, not merely unfinished.
    db.media.findUnique.mockResolvedValue(media({ product: { status: "archived" } }));

    expect(await getPublicMedia("media_1")).toBeNull();
  });

  it("answers nothing for an upload no product claims", async () => {
    // An image is stored before the form it was chosen in has been saved, so
    // rows with no product are the ordinary case rather than a corrupt one.
    db.media.findUnique.mockResolvedValue(media({ product: null }));

    expect(await getPublicMedia("media_1")).toBeNull();
  });

  it("answers nothing for a row with no bytes", async () => {
    db.media.findUnique.mockResolvedValue(media({ data: null }));

    expect(await getPublicMedia("media_1")).toBeNull();
  });

  it("answers nothing for a row with no content type", async () => {
    // A row with bytes and no type cannot be served as anything: the browser
    // would sniff it, which is the thing `nosniff` exists to stop. The admin
    // repo treats this as missing, and so does this one — the bytes are the
    // same bytes.
    db.media.findUnique.mockResolvedValue(media({ mimeType: null }));

    expect(await getPublicMedia("media_1")).toBeNull();
  });
});
