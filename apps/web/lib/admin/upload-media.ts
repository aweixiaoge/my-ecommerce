/**
 * The browser's side of `POST /admin/media`: sends one file, and reads back
 * the id the form will submit or the sentence saying why there is none.
 */

/** What an upload produced, or why it produced nothing. */
export type UploadResult =
  | { ok: true; media: { id: string; url: string; kind: "image" | "video" } }
  | { ok: false; message: string };

export async function uploadMedia(file: File): Promise<UploadResult> {
  const body = new FormData();
  body.set("file", file, file.name);

  const response = await fetch("/admin/media", { method: "POST", body });

  // The route answers its refusals as JSON too; anything else — a proxy's error
  // page, a dev-server restart — is a file that did not upload, and the caller's
  // catch says so.
  return (await response.json()) as UploadResult;
}
