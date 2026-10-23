// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_BYTES } from "@my-ecommerce/shared";

/**
 * The upload door, against stand-ins for the session and the store.
 *
 * What it owes: nobody signed out stores anything, a file outside the
 * allowlist is refused with the sentence the browser would have shown, and a
 * stored file comes back with its id and whether it is a video.
 */
const deps = vi.hoisted(() => ({ getSession: vi.fn(), putMedia: vi.fn() }));

vi.mock("@/lib/admin/session", () => ({ getSession: deps.getSession }));
vi.mock("@/lib/admin/media-repo", () => ({ putMedia: deps.putMedia }));

const { POST } = await import("./route");

function upload(file?: File) {
  const body = new FormData();
  if (file) body.set("file", file, file.name);
  return POST(new Request("http://shop.test/admin/media", { method: "POST", body }));
}

const sized = (name: string, type: string, size: number) =>
  new File([new Uint8Array(size)], name, { type });

beforeEach(() => {
  vi.clearAllMocks();
  deps.getSession.mockResolvedValue({ userId: "admin_1" });
  deps.putMedia.mockResolvedValue({ id: "media_1", url: "/admin/media/media_1" });
});

describe("POST /admin/media", () => {
  it("stores nothing for someone who is not signed in", async () => {
    deps.getSession.mockResolvedValue(null);

    const response = await upload(sized("a.png", "image/png", 10));

    expect(response.status).toBe(401);
    expect(deps.putMedia).not.toHaveBeenCalled();
  });

  it("refuses a request with no file in it", async () => {
    const response = await upload();

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false });
  });

  it("stores an image and says it is one", async () => {
    const response = await upload(sized("a.png", "image/png", 10));

    expect(await response.json()).toEqual({
      ok: true,
      media: { id: "media_1", url: "/admin/media/media_1", kind: "image" },
    });
    expect(deps.putMedia).toHaveBeenCalledWith(expect.objectContaining({ type: "image/png" }));
  });

  it("stores an MP4 larger than any image may be, and says it is a video", async () => {
    const response = await upload(sized("clip.mp4", "video/mp4", MAX_IMAGE_BYTES + 1));

    expect(await response.json()).toMatchObject({ ok: true, media: { kind: "video" } });
    expect(deps.putMedia).toHaveBeenCalledWith(expect.objectContaining({ type: "video/mp4" }));
  });

  it("refuses a type outside the allowlist, naming the file", async () => {
    const response = await upload(sized("logo.svg", "image/svg+xml", 10));

    expect(response.status).toBe(400);
    expect((await response.json()).message).toContain("logo.svg");
    expect(deps.putMedia).not.toHaveBeenCalled();
  });
});
