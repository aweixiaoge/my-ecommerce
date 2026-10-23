"use server";

import { ADMIN_PASSWORD_MIN_LENGTH, AdminUserCreateSchema } from "@my-ecommerce/shared";
import { redirect } from "next/navigation";
import { createAdminUser, DuplicateAdminNameError } from "@/lib/admin/admin-users-repo";
import { getSession } from "@/lib/admin/session";

/**
 * What the user screens do.
 *
 * Thin on purpose, like the coupon actions: the rule is the shared schema's
 * and the query is the repository's. Reachable by direct POST, so the session
 * is checked before anything is written — this one makes logins.
 */

type AdminUserField = "name" | "password" | "confirmPassword";

export interface AdminUserFormState {
  errors?: Partial<Record<AdminUserField, string[]>>;
  message?: string;
}

export async function createAdminUserAction(
  _prevState: AdminUserFormState | undefined,
  formData: FormData,
): Promise<AdminUserFormState | undefined> {
  if (!(await getSession())) {
    return { message: "Your session has expired. Sign in again." };
  }

  const parsed = AdminUserCreateSchema.safeParse({
    name: formData.get("name") ?? "",
    password: formData.get("password") ?? "",
    confirmPassword: formData.get("confirmPassword") ?? "",
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error.issues) };
  }

  try {
    await createAdminUser(parsed.data);
  } catch (error) {
    if (error instanceof DuplicateAdminNameError) {
      return { errors: { name: [error.message] } };
    }
    console.error("Creating an admin user failed:", error);
    return {
      message:
        "The user could not be saved. Try again, and check the server is running if it keeps failing.",
    };
  }

  // Outside the `try`: `redirect` signals by throwing.
  redirect("/admin/users");
}

/**
 * Validation issues as sentences, keyed by the field they are about — one per
 * field, since an empty name breaks both its length and its alphabet.
 */
function fieldErrors(
  issues: readonly { path: PropertyKey[]; code: string }[],
): AdminUserFormState["errors"] {
  const errors: NonNullable<AdminUserFormState["errors"]> = {};

  for (const issue of issues) {
    const field = issue.path[0] as AdminUserField;
    if (errors[field]) continue;
    errors[field] = [messageFor(field, issue.code)];
  }

  return errors;
}

function messageFor(field: AdminUserField, code: string): string {
  switch (field) {
    case "name":
      if (code === "too_small") return "Enter a username.";
      if (code === "too_big") return "Use at most 64 characters.";
      return "Use letters, digits, dots, dashes or underscores — no spaces.";
    case "password":
      return code === "too_big"
        ? "Use at most 200 characters."
        : `Use at least ${ADMIN_PASSWORD_MIN_LENGTH} characters.`;
    case "confirmPassword":
      return "The passwords do not match.";
  }
}
