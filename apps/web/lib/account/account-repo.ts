import { prisma } from "@my-ecommerce/db";
import type { AccountLogin, AccountRegister } from "@my-ecommerce/shared";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { Locale } from "@/lib/languages";
import {
  BROWSER_TTL_MS,
  REMEMBERED_TTL_MS,
  hashSessionToken,
  newSessionToken,
} from "./session-token";

/**
 * Customer accounts and their sessions.
 *
 * Free of Next.js, like `lib/admin/authenticate.ts`: plain values in, plain
 * results out, so the decisions are tested without a request. The account's
 * actions add the cookie and the redirect.
 *
 * Every session function takes the raw token and hashes it here; nothing
 * below stores one. `now` is a parameter so expiry is testable without fake
 * timers, the way the cart does it.
 */

/** Who is signed in — never the row, which carries the password hash. */
export interface AccountCustomer {
  id: string;
  email: string;
}

/**
 * A real scrypt hash of a password nobody has, checked when the email is
 * unknown — the admin's `ABSENT_USER_HASH`, for the admin's reason: skipping
 * the hash for a stranger answers in microseconds where a customer takes
 * ~50ms, and that difference is a list of who shops here.
 */
const ABSENT_CUSTOMER_HASH =
  "BSJcQ8rZazBstTklmzFDnA==:JUOgnaAtyVSrm0lpEwctDs3aaz8k5gTUexZ8bon7IgImXfG24BQrgAczEg1BXZ5uQTu+HIjHu0bIDW1jRITAOQ==";

/**
 * What a registration did.
 *
 * `taken` does say an address has an account, and that is accepted rather
 * than hidden: a register form that pretended otherwise would have to send an
 * email to say so, and there is no email yet. The login form, which can be
 * kept quiet, is.
 */
export type RegisterResult =
  | { status: "created"; customer: AccountCustomer }
  | { status: "taken" };

export async function registerCustomer(
  input: AccountRegister,
  locale: Locale,
): Promise<RegisterResult> {
  const passwordHash = await hashPassword(input.password);

  try {
    const customer = await prisma.customer.create({
      data: { email: input.email, passwordHash, locale },
      select: { id: true, email: true },
    });
    return { status: "created", customer };
  } catch (error) {
    // The unique index is the check, not a lookup before the insert: two
    // submissions of one address can both find nothing and both insert, and
    // only the index sees the second.
    if ((error as { code?: unknown }).code === "P2002") return { status: "taken" };
    throw error;
  }
}

/** The customer an email and password belong to, or null for either mistake. */
export async function authenticateCustomer(
  input: Pick<AccountLogin, "email" | "password">,
): Promise<AccountCustomer | null> {
  const row = await prisma.customer.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, passwordHash: true },
  });

  const matches = await verifyPassword(input.password, row?.passwordHash ?? ABSENT_CUSTOMER_HASH);
  if (!row || !matches) return null;

  return { id: row.id, email: row.email };
}

/**
 * Opens a session and returns the raw token — the only time it exists outside
 * the cookie the caller must put it in straight away.
 */
export async function openSession(
  customerId: string,
  remember: boolean,
  now = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = newSessionToken();
  const expiresAt = new Date(now.getTime() + (remember ? REMEMBERED_TTL_MS : BROWSER_TTL_MS));

  // Signing in is when this customer's dead sessions are cleared — the only
  // moment anything removes a row that was never presented again.
  await prisma.$transaction([
    prisma.customerSession.deleteMany({ where: { customerId, expiresAt: { lte: now } } }),
    prisma.customerSession.create({
      data: { customerId, tokenHash: hashSessionToken(token), expiresAt },
    }),
  ]);

  return { token, expiresAt };
}

/** The customer a live session belongs to, or null. */
export async function sessionCustomer(
  token: string | undefined,
  now?: Date,
): Promise<AccountCustomer | null> {
  if (!token) return null;

  const row = await prisma.customerSession.findFirst({
    where: {
      tokenHash: hashSessionToken(token),
      // Read only once there is a token, never as a default parameter — the
      // cart's rule; `lib/account/request.ts` is what makes the clock safe.
      expiresAt: { gt: now ?? new Date() },
    },
    select: { customer: { select: { id: true, email: true } } },
  });

  return row?.customer ?? null;
}

/**
 * Sign-out: the row goes, not just the cookie, so a copied token stops
 * working too. A no-op for an unknown token, so signing out twice is harmless.
 */
export async function closeSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.customerSession.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}
