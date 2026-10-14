"use server";

import { redirect } from "next/navigation";
import {
  authenticateLogin,
  type LoginFormState,
} from "@/lib/admin/authenticate";
import { createSession } from "@/lib/admin/session";

/**
 * The admin sign-in action.
 *
 * Thin on purpose: the credential decision is in `lib/admin/authenticate`, and
 * the session decision is in `lib/admin/session`. All this adds is the two
 * things that need a request — the cookie and the redirect.
 *
 * Server Actions are reachable by direct POST, not only through the form
 * rendered here, so this re-derives everything from `formData` and trusts
 * nothing else. There is no client-supplied "already authenticated" input it
 * could be fooled by.
 */
export async function login(
  _prevState: LoginFormState | undefined,
  formData: FormData,
): Promise<LoginFormState | undefined> {
  const result = await authenticateLogin(
    formData.get("name"),
    formData.get("password"),
  );

  if (!result.ok) return result.state;

  await createSession(result.user.id);

  // `redirect` signals by throwing, so it must not sit inside a `try/catch` —
  // a catch would swallow the navigation. It returns `never`, so this function
  // still satisfies its declared return type.
  redirect("/admin");
}
