import { isVideoType } from "@my-ecommerce/shared";
import { putMedia } from "@/lib/admin/media-repo";
import { fileProblem, mediaUrl } from "@/lib/admin/product-media";
import { getSession } from "@/lib/admin/session";
import type { UploadResult } from "@/lib/admin/upload-media";

/**
 * The one door into the media store: `POST /admin/media` with the file as the
 * `file` field of a multipart body.
 *
 * It lives beside the route that serves the bytes back (`[id]/route.ts`), and
 * every form that stores a picture posts here — the product form per colour,
 * the blog form per post, the About screen. What differs between them is what
 * happens to the returned id, not how the file is received.
 *
 * A route handler rather than the Server Action it used to be, because of
 * videos. An action's body limit is one global (`next.config.ts`), sized for a
 * 3 MB image; a 50 MB clip would mean raising it for every action in the app,
 * sign-in included. A route handler reads its own body and has no such cap —
 * and `proxy.ts` does not match `/admin`, so the proxy's body limit does not
 * apply either.
 *
 * One file per request, uploaded when it is chosen, so a save's payload stays a
 * few hundred bytes of ids. The refusals come back as JSON messages rather than
 * error statuses' bodies the form would have to parse differently: a rejected
 * file is something to tell someone about. They are the same sentences the
 * browser already showed — both sides call `fileProblem`.
 */
export async function POST(request: Request): Promise<Response> {
  // The admin shell gates screens at render time; this is reachable by direct
  // POST, and it stores bytes.
  if (!(await getSession())) {
    return Response.json(refusal("Your session has expired. Sign in again."), { status: 401 });
  }

  let file: FormDataEntryValue | null = null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    // Not multipart, or cut off mid-body.
  }

  // A missing field or a plain text one; not `instanceof File`, which tests a
  // realm's `File` class rather than whether the part is a file.
  if (file === null || typeof file === "string") {
    return Response.json(refusal("That upload could not be read. Try again."), { status: 400 });
  }

  // Videos are accepted here whichever form sent them: which pickers offer
  // them is the browser's decision (`planUploads`), and this checks only that
  // the bytes are a type and a size the store will serve.
  const problem = fileProblem(file, { video: true });
  if (problem) return Response.json(refusal(problem), { status: 400 });

  const media = await putMedia({
    bytes: new Uint8Array(await file.arrayBuffer()),
    // The validated type, not anything read later: `fileProblem` has just
    // refused everything outside the allowlist.
    type: file.type,
  });

  const result: UploadResult = {
    ok: true,
    media: { id: media.id, url: mediaUrl(media.id), kind: isVideoType(file.type) ? "video" : "image" },
  };
  return Response.json(result);
}

function refusal(message: string): UploadResult {
  return { ok: false, message };
}
