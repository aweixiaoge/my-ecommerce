import { prisma } from "@my-ecommerce/db";
import { mediaUrl } from "./product-media";

/**
 * Where an uploaded image goes.
 *
 * It replaces `lib/mock/admin-media.ts`, which held the bytes in a `Map` on
 * `globalThis` and lost them on the next restart. They live in the `media`
 * table now — a `bytea` column, which is not where a photograph belongs in a
 * finished shop and is exactly where it belongs before there is a bucket: it is
 * durable, it needs no new infrastructure, and moving out later is changing
 * what fills the column rather than changing the shape of anything else.
 *
 * The row is created with no product and no variant. That is not a gap to be
 * tidied up: an image is chosen while the form is still being filled in, and
 * the product it belongs to does not exist yet. `createProduct` claims it by
 * id, inside the same transaction that creates the variant it illustrates.
 */

/** The bytes and the type the route handler serves them back as. */
export interface StoredMedia {
  bytes: Uint8Array<ArrayBuffer>;
  /**
   * What the upload was validated as, not what the request claimed at read
   * time — the allowlist is applied on the way in, so the value stored here has
   * already been checked against it.
   */
  type: string;
}

/**
 * Stores one image and returns where it will be served from.
 *
 * Two statements in a transaction, because the URL contains the id and the id
 * is the database's to mint. The alternative — generating an id in the app so
 * the insert can be one statement — would put the responsibility for uniqueness
 * somewhere other than the column that enforces it.
 *
 * It takes an already-validated type: the upload action is the boundary, and it
 * has checked the type against `ACCEPTED_IMAGE_TYPES` and the size against
 * `MAX_IMAGE_BYTES` before anything gets here. Checking again would put a
 * second set of rules in a second place, which is how the two drift apart.
 */
export async function putMedia(input: {
  bytes: Uint8Array<ArrayBuffer>;
  type: string;
}): Promise<{ id: string; url: string }> {
  const id = await prisma.$transaction(async (tx) => {
    const created = await tx.media.create({
      data: { url: "", data: input.bytes, mimeType: input.type },
      select: { id: true },
    });

    await tx.media.update({
      where: { id: created.id },
      data: { url: mediaUrl(created.id) },
    });

    return created.id;
  });

  return { id, url: mediaUrl(id) };
}

/** The stored image, or null when no such id was ever stored. */
export async function getMedia(id: string): Promise<StoredMedia | null> {
  const media = await prisma.media.findUnique({
    where: { id },
    select: { data: true, mimeType: true },
  });

  // A row with bytes but no type cannot be served as anything — the browser
  // would sniff it, which is the thing `nosniff` exists to stop. Treated as
  // missing, so it 404s rather than being served as an unlabelled download.
  if (!media?.data || !media.mimeType) return null;

  return {
    // Copied into a plain view over a plain `ArrayBuffer`: whatever the driver
    // hands back, a `Response` takes a view over an `ArrayBuffer` and nothing
    // else.
    bytes: new Uint8Array(media.data),
    type: media.mimeType,
  };
}
