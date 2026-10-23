import { mediaResponse } from "@/lib/media-response";
import { getSession } from "@/lib/admin/session";
import { getMedia } from "@/lib/admin/media-repo";

/**
 * Serves an uploaded image by its id.
 *
 * The admin form renders its thumbnails through here rather than from a blob
 * URL or a data URL held in the page. Both of those would work in the moment
 * and then stop: a blob URL does not survive a reload, and a data URL inside
 * the product record is tens of megabytes copied on every read of the list.
 * Going through a route means the URL a freshly uploaded image is shown at is
 * the same URL it is shown at tomorrow — and, now that the bytes are in the
 * database rather than in a process's memory, at the same URL after a restart
 * as well.
 *
 * It is a route handler rather than a page because there is nothing to render:
 * the response is the bytes.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/admin/media/[id]">,
) {
  const { id } = await params;

  // Signed out and never-uploaded give the same answer, deliberately. The
  // admin shell refuses anyone who is not signed in, but this URL is not behind
  // it — it is a file, fetched by an <img> — so the check has to be here, and a
  // 404 says nothing about what does or does not exist to someone who is not
  // allowed to ask.
  if (!(await getSession())) return new Response(null, { status: 404 });

  const media = await getMedia(id);
  if (!media) return new Response(null, { status: 404 });

  /*
   * Cacheable for as long as the browser will have it, and it is worth
   * saying why that is safe: these bytes never change. A row is written
   * once, by `putMedia`, and the only later write is the product and
   * variant it belongs to — nothing ever rewrites `data`. Replacing an
   * image does not rewrite this URL either: the replacement is a new
   * upload with a new id, so the URL that used to hold the old bytes is
   * never asked for again.
   *
   * `no-store` was the first thing written here, on the reasoning that an
   * image an admin can remove is not a cache entry. It is the wrong
   * reasoning: removing it deletes the row, and nothing refers to the URL
   * afterwards, so a cached copy is a copy nobody will ask for. What
   * `no-store` actually did was make every page view re-fetch every image
   * — and reading a few megabytes out of the database is not free, which
   * on the local dev server is several hundred milliseconds per image.
   *
   * `private` and not `public`: this is served behind the admin's session,
   * and a shared cache must not hold it.
   */
  return mediaResponse(request, media, "private, max-age=31536000, immutable");
}
