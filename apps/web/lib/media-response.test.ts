import { describe, expect, it } from "vitest";
import { mediaResponse, parseRange } from "./media-response";

/**
 * Range requests, which a `<video>` makes and an `<img>` does not.
 *
 * Safari will not play a source that answers a range with the whole file, so
 * the 206 is the part that matters; the plain 200 is what every image already
 * got, and must keep getting.
 */
const media = { bytes: new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), type: "video/mp4" };

const request = (range?: string) =>
  new Request("http://shop.test/media/m1", range ? { headers: { range } } : undefined);

describe("parseRange", () => {
  it("reads an open-ended range to the end", () => {
    expect(parseRange("bytes=0-", 10)).toEqual([0, 9]);
  });

  it("reads a closed range, clamped to the file", () => {
    expect(parseRange("bytes=2-4", 10)).toEqual([2, 4]);
    expect(parseRange("bytes=8-100", 10)).toEqual([8, 9]);
  });

  it("reads a suffix as the last bytes", () => {
    expect(parseRange("bytes=-3", 10)).toEqual([7, 9]);
    expect(parseRange("bytes=-30", 10)).toEqual([0, 9]);
  });

  it("refuses what cannot be satisfied", () => {
    expect(parseRange("bytes=10-", 10)).toBeNull();
    expect(parseRange("bytes=5-2", 10)).toBeNull();
    expect(parseRange("bytes=-0", 10)).toBeNull();
    expect(parseRange("bytes=-", 10)).toBeNull();
    expect(parseRange("items=0-1", 10)).toBeNull();
  });
});

describe("mediaResponse", () => {
  it("answers a request with no range with the whole file, saying ranges are welcome", async () => {
    const response = mediaResponse(request(), media, "public");

    expect(response.status).toBe(200);
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-length")).toBe("10");
    expect(response.headers.get("content-type")).toBe("video/mp4");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toBe("public");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(media.bytes);
  });

  it("answers a range with just those bytes and where they sit", async () => {
    const response = mediaResponse(request("bytes=2-4"), media, "public");

    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 2-4/10");
    expect(response.headers.get("content-length")).toBe("3");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([2, 3, 4]);
  });

  it("answers an unsatisfiable range with 416 and the file's size", () => {
    const response = mediaResponse(request("bytes=50-"), media, "public");

    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */10");
  });
});
