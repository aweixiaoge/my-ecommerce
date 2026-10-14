import { createHash, randomBytes } from "node:crypto";

/**
 * Server-side admin sessions, shaped like the `sessions` table in plan.md
 * (`token_hash`, `expires_at`).
 *
 * ## This is an in-memory stand-in, and it has the flaws of one
 *
 * - **It dies with the process.** Restarting the dev server signs everyone out.
 * - **It is per-process.** More than one server instance means a session
 *   created by one is invisible to the others. That is fine today — there is
 *   one instance and no database — and it is the first thing the real
 *   implementation must fix.
 *
 * It is kept honest by storing only the SHA-256 of the token, exactly as the
 * Postgres table will, so the move to a real session store is a change of
 * backing store rather than a change of design.
 */

/** 256 bits. Guessing one is not a threat model; leaking one is. */
const TOKEN_BYTES = 32;

/** Eight hours: long enough for a working day, short enough to bound a stolen cookie. */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

interface SessionRecord {
  adminId: string;
  expiresAt: number;
}

/**
 * Pinned to `globalThis`, not held in a module binding.
 *
 * In `next dev`, Turbopack re-evaluates a module when it or anything it imports
 * changes. A module-level Map would be replaced on every such edit, silently
 * signing everyone out mid-session with no error to explain it — the kind of
 * bug that gets blamed on the cookie. Pinning it keeps hot reload honest.
 *
 * It does nothing for the multi-instance case, which no in-process store can.
 */
const sessionGlobal = globalThis as unknown as {
  __adminSessions?: Map<string, SessionRecord>;
};

const sessions = (sessionGlobal.__adminSessions ??= new Map<
  string,
  SessionRecord
>());

/**
 * Creates a session and returns the RAW token, which is the only time it
 * exists outside the client's cookie.
 *
 * Only the hash is stored, so this Map — a heap dump, a debugger, a stray
 * `console.log` of the store — never yields anything that can be replayed as a
 * cookie. The caller must put `token` straight into an httpOnly cookie.
 *
 * `now` is a parameter so expiry is testable without fake timers.
 */
export function createSessionToken(
  adminId: string,
  now: number = Date.now(),
): { token: string; expiresAt: number } {
  // Signing in is a natural moment to clear the dead. Without it, nothing ever
  // removes an entry that was never presented again — every sign-in would leak
  // a token for the life of the process.
  sweepExpired(now);

  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = now + SESSION_TTL_MS;

  sessions.set(hashToken(token), { adminId, expiresAt });

  return { token, expiresAt };
}

/**
 * Returns the admin id a token belongs to, or null.
 *
 * An expired session is deleted on the way past rather than left for a sweeper:
 * there is no sweeper, and an expired row that lingers is one that can be
 * resurrected by a clock change.
 */
export function verifySessionToken(
  token: string,
  now: number = Date.now(),
): string | null {
  const key = hashToken(token);
  const record = sessions.get(key);
  if (!record) return null;

  if (record.expiresAt <= now) {
    sessions.delete(key);
    return null;
  }

  return record.adminId;
}

/** Sign-out. A no-op for an unknown token, so a double sign-out is harmless. */
export function destroySessionToken(token: string): void {
  sessions.delete(hashToken(token));
}

/**
 * The stored keys, for tests only.
 *
 * The invariant "the raw token is never persisted" has no behavioural
 * consequence — a store that kept raw tokens would pass every other test here.
 * Reading the keys is the only way to hold that line.
 */
export function sessionStoreKeys(): string[] {
  return [...sessions.keys()];
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Deleting from a Map while iterating it is safe; entries added later are not visited. */
function sweepExpired(now: number): void {
  for (const [key, record] of sessions) {
    if (record.expiresAt <= now) sessions.delete(key);
  }
}
