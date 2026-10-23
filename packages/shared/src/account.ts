import { z } from "zod";

/**
 * What the My account page's two forms send (Figma 178:2691): "Login" and
 * "Register".
 *
 * Customer identity only. The admin's login is `admin.ts`, and the two never
 * share a schema, a table or a cookie (plan.md, decision 6).
 *
 * An email is trimmed and lower-cased here, before anything looks it up, so
 * `Ada@Example.com ` and `ada@example.com` are one account — the unique index
 * on `customers.email` is what holds that, and it can only hold it for a value
 * that arrives already folded.
 */

/** plan.md's `customers.email` ceiling, the one checkout's email uses too. */
export const ACCOUNT_EMAIL_MAX = 200;

/**
 * The shortest password an account may be opened with.
 *
 * Eight, the floor NIST SP 800-63B sets for a password a person chooses. No
 * composition rules (a digit, a symbol): the same guidance is that they push
 * people towards `Password1!` rather than towards anything stronger.
 */
export const ACCOUNT_PASSWORD_MIN = 8;

/**
 * The longest. A denial-of-service bound rather than policy — the value goes
 * straight into a deliberately expensive hash — and the admin's ceiling.
 */
export const ACCOUNT_PASSWORD_MAX = 200;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(ACCOUNT_EMAIL_MAX)
  .pipe(z.email());

/**
 * Signing in.
 *
 * `password` is only `min(1)`, for the reason `AdminLoginSchema` gives: a login
 * must accept whatever an existing password is, and enforcing the creation
 * policy here would only tell a stranger what the policy is.
 */
export const AccountLoginSchema = z.object({
  email,
  password: z.string().min(1).max(ACCOUNT_PASSWORD_MAX),
  /** "Remember me": a cookie that outlives the browser, and a longer session. */
  remember: z.boolean(),
});

export type AccountLogin = z.infer<typeof AccountLoginSchema>;

/**
 * Opening an account. The confirmation is checked here rather than in the
 * form, so a request that skips the page is held to the same rule.
 */
export const AccountRegisterSchema = z
  .object({
    email,
    password: z.string().min(ACCOUNT_PASSWORD_MIN).max(ACCOUNT_PASSWORD_MAX),
    confirmPassword: z.string().max(ACCOUNT_PASSWORD_MAX),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "mismatch",
  });

export type AccountRegister = z.infer<typeof AccountRegisterSchema>;
