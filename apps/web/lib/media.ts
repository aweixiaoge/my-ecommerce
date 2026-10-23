/**
 * An image's bytes, and what to serve them as.
 *
 * App-level rather than `lib/admin/`, because two route handlers now answer with
 * this shape: the admin's, which serves any upload to a signed-in administrator
 * so a form can show a thumbnail it just attached, and the storefront's, which
 * serves a published product's photos to anyone. Both need the same pair, and
 * the storefront importing it from the admin would be the storefront knowing
 * about a screen it has nothing to do with.
 */
export interface StoredMedia {
  bytes: Uint8Array<ArrayBuffer>;
  /**
   * What the upload was validated as, not what the request claimed at read
   * time — the allowlist is applied on the way in, so the value stored here has
   * already been checked against it.
   */
  type: string;
}

/** The columns either reader has to ask for to serve an image. */
export interface MediaBytes {
  data: Uint8Array | null;
  mimeType: string | null;
}

/**
 * A row's bytes as something a `Response` will take, or null when it cannot be
 * served as anything.
 *
 * One function because two route handlers now answer with these bytes — the
 * admin's and the storefront's — and this is the rule for *what may be served*.
 * Written twice, the two would drift, and the direction they would drift in is
 * the one that matters: a row with bytes and no type is served by content
 * sniffing instead of by a type we chose, which is the second door into serving
 * an upload as something executable.
 *
 * The copy is not incidental. Whatever the driver hands back, a `Response` takes
 * a view over a plain `ArrayBuffer` and nothing else.
 */
export function toStoredMedia(row: MediaBytes): StoredMedia | null {
  if (!row.data || !row.mimeType) return null;

  return { bytes: new Uint8Array(row.data), type: row.mimeType };
}

/**
 * Where a shopper's browser fetches an image from.
 *
 * Not the `url` column. That column holds `/admin/media/{id}`, written by the
 * admin's uploader, and it is gated behind an admin session — a card pointing at
 * it would render a 404 for every shopper. The column is in any case write-only
 * today: the admin form builds its thumbnails from the id through `mediaUrl()`,
 * so nothing reads what was stored there.
 */
export function publicMediaUrl(id: string): string {
  return `/media/${id}`;
}
