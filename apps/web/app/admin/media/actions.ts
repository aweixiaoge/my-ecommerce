"use server";

import { putMedia } from "@/lib/admin/media-repo";
import { fileProblem, mediaUrl } from "@/lib/admin/product-media";
import { getSession } from "@/lib/admin/session";

/**
 * The one door into the image store.
 *
 * It lives beside the route that serves the bytes back (`[id]/route.ts`)
 * rather than inside any one screen's actions, because every form that stores
 * an image posts here: the product form uploads per colour and the blog form
 * per post, and the difference between them is what happens to the returned id,
 * not how the file is received. A second door — a copy in the blog's actions,
 * say — is a second place a session check, a `File` check or the validated-type
 * handoff could drift.
 */

/** What an upload produced, or why it produced nothing. */
export type UploadResult =
  | { ok: true; media: { id: string; url: string } }
  | { ok: false; message: string };

/**
 * Stores one image and hands back the id the form will submit.
 *
 * One file per request, rather than the whole selection inside the create
 * payload: six photographs are tens of megabytes, and the action body limit is
 * a single global — raising it far enough for a full selection would raise it
 * for every action in the app, including sign-in. An image is uploaded when it
 * is chosen, so the create payload stays a few hundred bytes of JSON.
 *
 * The refusals come back as messages rather than throws, for the reason the
 * create actions' do: a rejected file is something to tell someone about, not a
 * 500. And they are the same sentences the browser already showed — both sides
 * call `fileProblem`, so the check before the request and the check after it
 * cannot disagree.
 */
export async function uploadMediaAction(file: File): Promise<UploadResult> {
  // The shell layout refuses anyone who is not signed in, but that is a
  // render-time gate: this is reachable by direct POST. An action that stores
  // bytes is worth the one line.
  if (!(await getSession())) {
    return { ok: false, message: "Your session has expired. Sign in again." };
  }

  if (!(file instanceof File)) {
    return { ok: false, message: "That upload could not be read. Try again." };
  }

  const problem = fileProblem(file);
  if (problem) return { ok: false, message: problem };

  const media = await putMedia({
    bytes: new Uint8Array(await file.arrayBuffer()),
    // The validated type, not the request's: `fileProblem` has just refused
    // anything outside the allowlist.
    type: file.type,
  });

  return { ok: true, media: { id: media.id, url: mediaUrl(media.id) } };
}
