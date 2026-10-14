import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  SESSION_TTL_MS,
  createSessionToken,
  destroySessionToken,
  sessionStoreKeys,
  verifySessionToken,
} from "./session-store";

/** Mirrors what the store persists, so a test can look for a token's presence. */
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");

describe("createSessionToken / verifySessionToken", () => {
  it("verifies a token it just created, and resolves it to the admin id", () => {
    const { token } = createSessionToken("adm_01");
    expect(verifySessionToken(token)).toBe("adm_01");
  });

  it("issues a distinct token each time, for the same admin", () => {
    // Sessions are per-login, not per-user: signing in twice must not produce
    // one token that both sessions share, or signing out of one ends both.
    const first = createSessionToken("adm_01");
    const second = createSessionToken("adm_01");
    expect(first.token).not.toBe(second.token);
    expect(verifySessionToken(first.token)).toBe("adm_01");
    expect(verifySessionToken(second.token)).toBe("adm_01");
  });

  it("stores only the hash of the token, never the token itself", () => {
    // The one invariant that makes an in-memory store safe to debug: what is
    // held is not replayable as a cookie.
    const { token } = createSessionToken("adm_01");

    expect(sessionStoreKeys()).toContain(digest(token));
    expect(sessionStoreKeys()).not.toContain(token);
  });

  it("rejects an unknown, empty, or tampered token", () => {
    const { token } = createSessionToken("adm_01");
    expect(verifySessionToken("not-a-real-token")).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    // A single flipped character is a different token.
    const tampered = token.slice(0, -1) + (token.at(-1) === "A" ? "B" : "A");
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("expires a token once its lifetime is up, exactly at the boundary", () => {
    const now = 1_000_000;
    const { token, expiresAt } = createSessionToken("adm_01", now);

    expect(expiresAt).toBe(now + SESSION_TTL_MS);
    expect(verifySessionToken(token, expiresAt - 1)).toBe("adm_01");
    // `<=`, not `<`: at the expiry instant the session is already over.
    expect(verifySessionToken(token, expiresAt)).toBeNull();
  });

  it("forgets an expired token rather than leaving it to be revived", () => {
    const now = 1_000_000;
    const { token, expiresAt } = createSessionToken("adm_01", now);

    expect(verifySessionToken(token, expiresAt)).toBeNull();
    expect(sessionStoreKeys()).not.toContain(digest(token));
  });

  it("clears expired sessions when a new one is created, and only those", () => {
    // Nothing else ever removes an entry that was never presented again, so
    // without this every sign-in leaks a token for the life of the process.
    const now = 1_000_000;
    const stale = createSessionToken("adm_01", now);
    const live = createSessionToken("adm_02", now + SESSION_TTL_MS / 2);

    createSessionToken("adm_03", now + SESSION_TTL_MS);

    expect(sessionStoreKeys()).not.toContain(digest(stale.token));
    expect(sessionStoreKeys()).toContain(digest(live.token));
  });

  it("invalidates a token on destroy, but leaves other sessions alone", () => {
    const doomed = createSessionToken("adm_01");
    const survivor = createSessionToken("adm_02");

    destroySessionToken(doomed.token);

    expect(verifySessionToken(doomed.token)).toBeNull();
    expect(verifySessionToken(survivor.token)).toBe("adm_02");
  });

  it("treats destroying an unknown token as a no-op", () => {
    expect(() => destroySessionToken("never-existed")).not.toThrow();
  });
});
