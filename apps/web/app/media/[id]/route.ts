import { getPublicMedia } from "@/lib/catalog/media-repo";

/**
 * Serves a published product photograph by its id.
 *
 * The storefront's counterpart to `/admin/media/[id]`, and public on purpose:
 * the shop's cards are rendered for people who are not signed in, and the page
 * an image is on is the advertisement for the product it shows. The admin route
 * could not do this job — it answers 404 to anyone without an admin session,
 * which is every shopper.
 *
 * What keeps that safe is the repo behind it rather than anything here: an id
 * naming a draft product, an unattached upload, or nothing at all gets the same
 * 404, so this URL cannot be walked to discover what is not published yet.
 *
 * A route handler rather than a page because there is nothing to render: the
 * response is the bytes.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/media/[id]">,
) {
  const { id } = await params;

  const media = await getPublicMedia(id);
  if (!media) return new Response(null, { status: 404 });

  return new Response(media.bytes, {
    headers: {
      // The type the upload was validated against, never the request's — and
      // `nosniff` because that validation reads a header the browser sent,
      // which a crafted request can claim anything in. Sniffing is the second
      // door into serving those bytes as something executable.
      "Content-Type": media.type,
      "X-Content-Type-Options": "nosniff",
      /*
       * `public`, unlike the admin route, which is `private` because it is
       * served behind a session and a shared cache must not hold what only an
       * administrator may see. There is no session here and nothing
       * user-specific in the response, so a CDN holding a copy is the point.
       *
       * The lifetime is an hour rather than the admin route's year, and the
       * reason is the difference between the two routes' subjects. That one
       * serves an upload to the administrator who made it: the bytes never
       * change, and nothing refers to the URL once the row is deleted, so a
       * cached copy is one nobody will ask for. This one serves a PUBLISHED
       * product, and publishing is reversible. A year of `immutable` would
       * leave a photograph of a product someone deliberately took off the shop
       * sitting in browsers and CDNs for a year, with no way to recall it —
       * and `next/image` reads this same header, so the optimizer would hold
       * it for a year too.
       *
       * So: the bytes are immutable, the authorization is not. An hour of
       * freshness, a day of `stale-while-revalidate` to keep the revalidation
       * off the request path, and unpublishing takes effect in about an hour.
       */
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
