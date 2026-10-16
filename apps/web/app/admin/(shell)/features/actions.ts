"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { AdminFeaturedProductSchema } from "@my-ecommerce/shared";
import { setFeaturedProduct } from "@/lib/admin/featured-products-repo";
import { getSession } from "@/lib/admin/session";

/**
 * What the feature screen does.
 *
 * Thin on purpose, like the status action next door: the rule is the shared
 * schema's and the query is the repository's. All this adds is the two things
 * that need a request — reading the form, and asking the router to re-render.
 *
 * Server Actions are reachable by direct POST, not only through the form that
 * renders here, so the payload is re-derived from `formData` and validated
 * before a single field reaches the store.
 */
export async function setFeaturedProductAction(
  formData: FormData,
): Promise<void> {
  // The shell layout refuses anyone who is not signed in, but that is a
  // render-time gate and this is reachable by direct POST. Validating the
  // payload is not the same as knowing who sent it: without this, a request
  // with no session at all rewrites what the home page will show.
  if (!(await getSession())) redirect("/admin/login");

  const parsed = AdminFeaturedProductSchema.safeParse({
    id: formData.get("id"),
    featured: formData.get("featured"),
  });

  // Nothing to say about a payload the app cannot produce: the buttons only
  // ever send one of two words, so a third one is a crafted POST and there is
  // no field on screen to report it against.
  if (!parsed.success) return;

  await setFeaturedProduct(parsed.data.id, parsed.data.featured === "featured");

  /*
   * `refresh` rather than `revalidatePath`: the screen reads the database at
   * request time and nothing about it is cached, so there is no cache entry to
   * drop — what has to happen is the client router re-rendering the page it is
   * already on. Revalidating a path nothing stores is a no-op that reads as if
   * it did something. The count the repository returns is discarded, like the
   * status action discards its own: the buttons only send states the row can
   * reach, so there is no outcome to report.
   */
  refresh();
}
