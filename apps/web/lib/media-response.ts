import type { StoredMedia } from "./media";

/**
 * Stored media as an HTTP response, honouring a `Range` header.
 *
 * Both media routes answer through here, because a product video made range
 * requests a requirement rather than a nicety: Safari will not play a `<video>`
 * whose source answers `bytes=0-1` with the whole file, and every browser
 * seeks by asking for a range. An image never sends one, and gets the plain
 * 200 it always did.
 *
 * The slice is cut from bytes already read, not from the database: the store
 * hands back a row's whole `data`, and reading a part of a `bytea` would be a
 * second query shape for the same rule. For a 50 MB clip that is a full read
 * per range — fine at this shop's size, and the thing to change first if the
 * media moves to a bucket.
 */
export function mediaResponse(request: Request, media: StoredMedia, cacheControl: string): Response {
  const size = media.bytes.byteLength;
  const headers: Record<string, string> = {
    // The type the upload was validated against, never the request's — and
    // `nosniff` because that validation reads a header the browser sent, which
    // a crafted request can claim anything in. Sniffing is the second door
    // into serving those bytes as something executable.
    "Content-Type": media.type,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": cacheControl,
    "Accept-Ranges": "bytes",
  };

  const header = request.headers.get("range");
  if (!header) {
    return new Response(media.bytes, { headers: { ...headers, "Content-Length": String(size) } });
  }

  const range = parseRange(header, size);
  if (!range) {
    return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
  }

  const [start, end] = range;
  return new Response(media.bytes.slice(start, end + 1), {
    status: 206,
    headers: {
      ...headers,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
    },
  });
}

/**
 * The inclusive byte span a `Range` header asks for, or null when it cannot be
 * satisfied.
 *
 * One span only — `bytes=0-`, `bytes=100-199`, `bytes=-500` — which is all a
 * media element asks for. A multi-range request is answered with its first
 * span rather than a multipart body nobody here would read.
 */
export function parseRange(header: string, size: number): [number, number] | null {
  const match = /^bytes=(\d*)-(\d*)/.exec(header.trim());
  if (!match || size === 0) return null;

  const [, from, to] = match;
  if (from === "" && to === "") return null;

  if (from === "") {
    // A suffix: the last N bytes.
    const length = Number(to);
    if (length === 0) return null;
    return [Math.max(0, size - length), size - 1];
  }

  const start = Number(from);
  const end = to === "" ? size - 1 : Math.min(Number(to), size - 1);
  if (start >= size || end < start) return null;

  return [start, end];
}
