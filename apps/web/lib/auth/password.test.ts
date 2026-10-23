import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

const PASSWORD = "correct horse battery staple";

describe("hashPassword / verifyPassword", () => {
  it("verifies the password it was given", async () => {
    const hash = await hashPassword(PASSWORD);
    expect(await verifyPassword(PASSWORD, hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword(PASSWORD);
    expect(await verifyPassword("wrong horse battery staple", hash)).toBe(false);
  });

  it("never stores the plaintext password", async () => {
    // The whole point of hashing here. If this ever fails, an account or the mock store has
    // started writing credentials in the clear.
    const hash = await hashPassword(PASSWORD);
    expect(hash).not.toContain(PASSWORD);
    expect(hash.includes("correct")).toBe(false);
  });

  it("produces a different hash each time, and both still verify", async () => {
    // A shared salt would let one precomputed table crack every admin at once.
    const first = await hashPassword(PASSWORD);
    const second = await hashPassword(PASSWORD);
    expect(first).not.toBe(second);
    expect(await verifyPassword(PASSWORD, first)).toBe(true);
    expect(await verifyPassword(PASSWORD, second)).toBe(true);
  });

  it("rejects a malformed stored hash instead of throwing", async () => {
    // A corrupt row must read as "wrong password". Throwing would turn one bad
    // record into a 500 — and into a way to tell a corrupt row from a valid one.
    const malformed = [
      "",
      "not-a-hash-at-all",
      ":",
      "salt-only:",
      ":key-only",
      "too:many:parts",
      "!!!:!!!",
      // Valid base64, wrong shape: a salt that decodes to fewer than 16 bytes.
      "c2hvcnQ=:aGFzaA==",
    ];

    for (const stored of malformed) {
      await expect(verifyPassword(PASSWORD, stored)).resolves.toBe(false);
    }
  });

  it("rejects a stored key length outside the accepted range, without deriving it", async () => {
    // `verifyPassword` derives to the *stored* key's length, so an absurd
    // length is an instruction to burn CPU. The bounds check has to come first.
    const salt = Buffer.alloc(16, 1).toString("base64");

    const tooShort = `${salt}:${Buffer.alloc(4, 2).toString("base64")}`;
    expect(await verifyPassword(PASSWORD, tooShort)).toBe(false);

    const tooLong = `${salt}:${Buffer.alloc(1025, 2).toString("base64")}`;
    expect(await verifyPassword(PASSWORD, tooLong)).toBe(false);
  });
});
