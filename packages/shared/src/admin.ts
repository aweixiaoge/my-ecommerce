import { z } from "zod";

/**
 * Admin identity is separate from customer identity — a different table, a
 * different session, a different login route (plan.md, decision 6). Nothing in
 * this file may be reused for customer auth.
 */

/** Provisional: plan.md specifies an `admin_users.role` column but not its values. */
export const AdminRoleSchema = z.enum(["owner", "staff"]);

export type AdminRole = z.infer<typeof AdminRoleSchema>;

/**
 * The admin login payload, shared with the API so both ends validate the same
 * thing.
 *
 * `password` is only `min(1)`. A login form must accept whatever an existing
 * password happens to be: enforcing the *creation* policy here would lock out
 * any account whose password predates a policy change, and it would tell an
 * attacker what the policy is. Length rules belong on the reset/change path.
 *
 * The upper bounds are denial-of-service limits, not policy — unbounded input
 * feeds straight into a deliberately-expensive password hash. `max(200)` on the
 * password is also below bcrypt's 72-byte truncation point only in spirit: the
 * API must reject longer inputs rather than silently truncating them.
 *
 * `name` is trimmed before the length check, so "   " is empty and fails.
 *
 * NOTE: the identifier is `name`, not the `email` that plan.md line 112 lists
 * for `admin_users`. That is a deliberate decision, not a drift — do not
 * "correct" this back without asking. Whoever builds the `admin_users` table
 * must align the column with this field.
 */
export const AdminLoginSchema = z.object({
  name: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

export type AdminLoginInput = z.infer<typeof AdminLoginSchema>;

/** An authenticated admin, as the rest of the app sees one. Never a password hash. */
export const AdminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: AdminRoleSchema,
});

export type AdminUser = z.infer<typeof AdminUserSchema>;
