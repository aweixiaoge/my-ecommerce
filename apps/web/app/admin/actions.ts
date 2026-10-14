"use server";

import { redirect } from "next/navigation";
import { deleteSession } from "@/lib/admin/session";

/**
 * Sign-out.
 *
 * A Server Action rather than a link: clearing a cookie is a state change, and
 * a GET that signs you out can be triggered by any image tag on any page.
 */
export async function signOut(): Promise<void> {
  await deleteSession();

  // Outside any try/catch — `redirect` signals by throwing.
  redirect("/admin/login");
}
