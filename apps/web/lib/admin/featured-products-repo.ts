import { prisma } from "@my-ecommerce/db";

/**
 * Where the admin reads and writes the home page's featured set.
 *
 * The same shape as the status write in `products-repo` — a statement in, a
 * count out — with one difference the table of its own brings: a row here is
 * *created*, and an insert can fail in a way an update cannot.
 */

/**
 * The featured products' ids, in the order they were featured.
 *
 * The tiebreak is the lesson `listCategories` writes down: one ordering key
 * leaves the rest to Postgres, and a list that shuffles between reads is a list
 * that gets the wrong row clicked. Two rows featured in the same millisecond
 * fall back on the id, which never ties.
 *
 * Order is intent, not a contract yet: the screen renders a set, and the home
 * page's eventual read gets to choose its own order.
 */
export async function listFeaturedProductIds(): Promise<string[]> {
  const rows = await prisma.featuredProduct.findMany({
    orderBy: [{ createdAt: "asc" }, { productId: "asc" }],
    select: { productId: true },
  });

  return rows.map((row) => row.productId);
}

/**
 * Features or unfeatures one product, and answers how many rows changed.
 *
 * `createMany` with `skipDuplicates` for the reason the status write uses
 * `updateMany`: what the form sends is a state, not a diff, so a click on a row
 * that is already in that state — a double submit, a page rendered before
 * someone else's click — is a no-op rather than a duplicate row or an error.
 *
 * The id arrives in a form field, so it can name a product that is not there:
 * deleted in another tab between the page rendering and the click, or invented
 * by a crafted POST. A missing product is a no-op of the same kind as an
 * already-featured one — 0 changed, no exception — because there is nothing on
 * screen to say either sentence against. `product_id` is this table's only
 * client-supplied foreign key, so the `P2003` can only be that; the caveat
 * `products-repo` writes down about its own is not needed here, and stops being
 * true the day a second one appears.
 *
 * The count is the answer to "did anything happen". The action discards it
 * today, the way the status action discards its own — it exists so the callers
 * that want to say something can, without this function having to guess.
 */
export async function setFeaturedProduct(
  productId: string,
  featured: boolean,
): Promise<number> {
  if (!featured) {
    const { count } = await prisma.featuredProduct.deleteMany({
      where: { productId },
    });

    return count;
  }

  try {
    const { count } = await prisma.featuredProduct.createMany({
      data: [{ productId }],
      skipDuplicates: true,
    });

    return count;
  } catch (error) {
    if (isMissingProduct(error)) return 0;
    throw error;
  }
}

/**
 * Whether this is the foreign key refusing a row that names no product.
 *
 * The `typeof` guard is not decoration: `throw null` is legal, and reading
 * `.code` off it is how a classifier turns an odd failure into a swallowed one.
 * A `P2003` from this insert can only be the product — see above.
 */
function isMissingProduct(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  return (error as { code?: unknown }).code === "P2003";
}
