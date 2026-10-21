"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin/session";
import { noticeFor } from "@/lib/admin/translation-notice";
import { translateEntity, type TranslatableKind } from "@/lib/admin/translations";

/**
 * What the Translate button on a list row does.
 *
 * One action for all four kinds of content, because the work is one function
 * (`translateEntity`) and the only thing that differs is which list to come
 * back to. It is the same pass the create actions run — a machine row is
 * refreshed, a person's row is left alone — so pressing it twice is pressing it
 * once, and pressing it after a partial failure finishes what it can.
 *
 * It redirects rather than refreshing, unlike the status buttons: the point of
 * pressing Translate is to learn what happened, and what happened is carried in
 * the URL the list reads. A refresh would leave the page showing nothing new.
 */

/** Each kind's list, and where its notice hangs. */
const LIST: Record<TranslatableKind, string> = {
  product: "/admin/products",
  category: "/admin/categories",
  blog: "/admin/blogs",
  blogCategory: "/admin/blog-categories",
};

export async function translateEntityAction(formData: FormData): Promise<void> {
  if (!(await getSession())) redirect("/admin/login");

  const kind = formData.get("kind");
  const id = formData.get("id");

  // The buttons on screen only ever send one of four words and a row's id, so
  // anything else is a crafted POST — and there is no screen to report it on.
  if (!isKind(kind) || typeof id !== "string" || id === "") return;

  const run = await translateEntity(kind, id);

  redirect(`${LIST[kind]}?translated=${noticeFor(run)}`);
}

function isKind(value: unknown): value is TranslatableKind {
  return typeof value === "string" && value in LIST;
}
