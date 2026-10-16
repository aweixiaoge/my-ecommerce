import { describe, expect, it } from "vitest";
import { toStoredMedia } from "./media";

/**
 * The rule for what may be served, tested where it lives.
 *
 * Both route handlers delegate this to one function, so these cases cover both
 * — and the storefront's route is the one where a mistake is public.
 */
describe("toStoredMedia", () => {
  it("hands back the bytes and the type a response needs", () => {
    const stored = toStoredMedia({
      data: new Uint8Array([1, 2, 3]),
      mimeType: "image/png",
    });

    expect(Array.from(stored!.bytes)).toEqual([1, 2, 3]);
    expect(stored!.type).toBe("image/png");
  });

  it("answers nothing for a row with no bytes", () => {
    expect(toStoredMedia({ data: null, mimeType: "image/png" })).toBeNull();
  });

  it("answers nothing for a row whose bytes have no type", () => {
    // A row with bytes and no type cannot be served as anything: the browser
    // would sniff it, which is the thing `nosniff` exists to stop.
    expect(toStoredMedia({ data: new Uint8Array([1]), mimeType: null })).toBeNull();
  });

  it("answers nothing for a row that is empty in both columns", () => {
    expect(toStoredMedia({ data: null, mimeType: null })).toBeNull();
  });

  it("returns a plain view over an ArrayBuffer, not the driver's object", () => {
    // A `Response` takes a view over an `ArrayBuffer` and nothing else, and
    // what a driver hands back is not always one. Copied, so the bytes the
    // response holds are the bytes that were read.
    const source = new Uint8Array([9, 8, 7]);
    const stored = toStoredMedia({ data: source, mimeType: "image/jpeg" });

    source[0] = 0;

    expect(Array.from(stored!.bytes)).toEqual([9, 8, 7]);
    expect(stored!.bytes.buffer).toBeInstanceOf(ArrayBuffer);
  });
});
