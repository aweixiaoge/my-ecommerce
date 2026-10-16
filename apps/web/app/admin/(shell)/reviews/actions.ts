"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { AdminReviewModerateSchema } from "@my-ecommerce/shared";
import { setReviewStatus } from "@/lib/admin/reviews-repo";
import { getSession } from "@/lib/admin/session";

/**
 * Approving or rejecting a review, from a button in the queue.
 *
 * The same shape as `setProductStatusAction`, and for the same reasons: a form
 * action rather than a handler a client component calls, so a button that
 * decides what shoppers read works before React has loaded; the payload
 * re-validated here, because a Server Action is reachable by direct POST and
 * the shell layout's session check is a render-time gate.
 */

export async function setReviewStatusAction(formData: FormData): Promise<void> {
  if (!(await getSession())) redirect("/admin/login");

  const parsed = AdminReviewModerateSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });

  // Nothing to say about a payload the app cannot produce: the buttons only
  // ever send one of two words, so a third one is a crafted POST and there is
  // no field on screen to report it against.
  if (!parsed.success) return;

  await setReviewStatus(parsed.data.id, parsed.data.status);

  // `refresh` rather than `revalidatePath`: the queue reads the database at
  // request time and nothing about it is cached, so there is no cache entry to
  // drop — what has to happen is the router re-rendering the page it is on.
  refresh();
}
