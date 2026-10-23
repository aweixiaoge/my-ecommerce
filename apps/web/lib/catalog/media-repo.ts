import { prisma } from "@my-ecommerce/db";
import { toStoredMedia, type StoredMedia } from "../media";

/**
 * Reading images for the storefront.
 *
 * A second reader of the same table as `lib/admin/media-repo.ts`, and a second
 * route to serve it, because the two audiences are different questions. The
 * admin's route answers "show me this upload" for a signed-in administrator, so
 * a form can render a thumbnail it attached a moment ago — including for a
 * product that does not exist yet. This one answers "show me this product's
 * photograph" for anyone at all, and the only media it may answer with is media
 * on something that has been published.
 *
 * That is the whole authorization rule, and it is why the two routes are not
 * one route with a conditional: a single handler whose answer depends on the
 * requester's session is a handler where one wrong branch makes every draft
 * photograph public.
 */

// Kept in `lib/media.ts`, which has no database in it, so a component that only
// needs the address does not load the client; re-exported for the callers here.
export { publicMediaUrl } from "../media";

/**
 * The bytes of a published photograph, or null when there are none to serve.
 *
 * Null covers four different situations on purpose — no such row, a row with no
 * bytes, a row with no content type, and a row on neither an `active` product
 * nor a journal post — and they are indistinguishable from outside, which is
 * the point.
 * A 404 that meant "this exists but is a draft" would confirm the existence of
 * unpublished products to anyone willing to guess a cuid.
 *
 * The product link is the only one checked. Media can also hang off a variant,
 * but every write path claims an upload with both the product and the variant
 * (`insertProduct` and `writeProduct` in the admin repo), so a row reachable
 * through the variant alone is not a state this app produces.
 */
export async function getPublicMedia(id: string): Promise<StoredMedia | null> {
  const media = await prisma.media.findUnique({
    where: { id },
    select: {
      data: true,
      mimeType: true,
      product: { select: { status: true } },
      blogId: true,
      aboutPage: true,
    },
  });

  if (!media || !isPublished(media)) return null;

  // Whether these particular bytes can be served at all is `toStoredMedia`'s
  // question, and it is the same question for the admin route — the bytes are
  // the same bytes. Only "and is it published" belongs to this file.
  return toStoredMedia(media);
}

/**
 * Whether the photograph is on something the public can see: an active
 * product, a journal post, or the About page. Posts have no draft state —
 * every row in `blogs` is on the Journal — so being on a post is being
 * published, and the About page is always up.
 */
function isPublished(media: {
  product: { status: string } | null;
  blogId: string | null;
  aboutPage: boolean;
}): boolean {
  return media.product?.status === "active" || media.blogId !== null || media.aboutPage;
}
