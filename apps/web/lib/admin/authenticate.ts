import { AdminLoginSchema, type AdminUser } from "@my-ecommerce/shared";
import { findAdminByName } from "../mock/admin-users";
import { verifyPassword } from "./password";

/**
 * The credential check, deliberately free of Next.js.
 *
 * It takes plain values and returns a plain result, so it can be tested
 * directly instead of through a Server Action — no request context, no
 * `next/headers` to mock. `app/admin/login/actions.ts` is the thin wrapper
 * that adds the session cookie and the redirect.
 */

export interface LoginFormState {
  errors?: {
    name?: string[];
    password?: string[];
  };
  message?: string;
}

export type LoginResult =
  | { ok: true; user: AdminUser }
  | { ok: false; state: LoginFormState };

/**
 * One message for both failure modes, on purpose.
 *
 * "No such admin" and "wrong password" must be indistinguishable, or the login
 * form becomes a way to enumerate admin names — which is the first thing an
 * attacker wants and the only thing this form would otherwise hand over.
 */
const INVALID_CREDENTIALS = "Name or password is incorrect.";

/**
 * A real scrypt hash of a password nobody has, used when the name is unknown.
 *
 * Without it, an unknown name skips the hash entirely and returns in
 * microseconds while a known name takes ~50ms, which rebuilds the enumeration
 * oracle the shared message above closes. The cost has to be paid either way.
 */
const ABSENT_USER_HASH =
  "vBWpUDt6q0/h0LZ87NXFog==:5lPnd+gvEF9R5xbqQPaCfSFusgQ0ZarjyaR33+T4AldFmFLFNK5cL2AbY0LzgTbr5eex/f9S+qOEr5KY3a4ohQ==";

export async function authenticateLogin(
  name: unknown,
  password: unknown,
): Promise<LoginResult> {
  const parsed = AdminLoginSchema.safeParse({ name, password });
  if (!parsed.success) {
    return { ok: false, state: { errors: fieldErrors(parsed.error.issues) } };
  }

  const record = await findAdminByName(parsed.data.name);

  const passwordMatches = await verifyPassword(
    parsed.data.password,
    record?.passwordHash ?? ABSENT_USER_HASH,
  );

  if (!record || !passwordMatches) {
    return { ok: false, state: { message: INVALID_CREDENTIALS } };
  }

  // Return the narrow shape, not the record: `passwordHash` must not travel
  // any further than this function.
  return {
    ok: true,
    user: { id: record.id, name: record.name, role: record.role },
  };
}

/**
 * Turns validation issues into messages a person can act on.
 *
 * The copy lives here rather than in the shared schema on purpose: the schema
 * is the contract both apps validate against, and it has no business carrying
 * one app's UI strings — least of all when the storefront is heading for
 * multi-language (plan.md, decision 1).
 */
function fieldErrors(
  issues: readonly { code: string; path: readonly PropertyKey[] }[],
): LoginFormState["errors"] {
  const errors: NonNullable<LoginFormState["errors"]> = {};

  for (const issue of issues) {
    const field = String(issue.path[0]);
    if (field !== "name" && field !== "password") continue;

    // The only failure a person can fix differently is an over-long value;
    // everything else means "this box is empty".
    const message =
      issue.code === "too_big"
        ? field === "name"
          ? "Name is too long."
          : "Password is too long."
        : field === "name"
          ? "Enter your name."
          : "Enter your password.";

    (errors[field] ??= []).push(message);
  }

  return errors;
}
