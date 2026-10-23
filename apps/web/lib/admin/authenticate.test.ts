import { describe, expect, it, vi } from "vitest";
import { authenticateLogin } from "./authenticate";

// An empty `admin_users` table, so the dev accounts are what signs in.
vi.mock("@my-ecommerce/db", () => ({
  prisma: { adminUser: { findFirst: vi.fn(async () => null) } },
}));

const NAME = "admin";

/**
 * The credential documented in `lib/mock/admin-users.ts`, spelled out rather
 * than imported: it exists here so that changing the stored hash without
 * updating the documentation — or the other way round — fails this file.
 */
const PASSWORD = "111111";

describe("authenticateLogin", () => {
  it("returns the signed-in admin for correct credentials", async () => {
    const result = await authenticateLogin(NAME, PASSWORD);

    expect(result.ok).toBe(true);
    expect(result.ok && result.user).toEqual({
      id: "adm_01",
      name: "admin",
      role: "owner",
    });
  });

  it("never returns the password hash to the caller", async () => {
    // The hash must not travel past this function — it would end up in a
    // session, a log, or a rendered prop.
    const result = await authenticateLogin(NAME, PASSWORD);
    expect(JSON.stringify(result)).not.toContain("passwordHash");
  });

  it("accepts a name that differs only in case or padding", async () => {
    const result = await authenticateLogin("  ADMIN  ", PASSWORD);
    expect(result.ok).toBe(true);
  });

  it("gives the same answer for a wrong password and an unknown name", async () => {
    // The whole point: the form must not be usable to find out which admin
    // names exist.
    const wrongPassword = await authenticateLogin(NAME, "not-the-password");
    const unknownName = await authenticateLogin("nobody", PASSWORD);

    expect(wrongPassword.ok).toBe(false);
    expect(unknownName.ok).toBe(false);
    expect(wrongPassword.ok === false && wrongPassword.state).toEqual(
      unknownName.ok === false ? unknownName.state : null,
    );
  });

  it("reports a failed credential check as a form message, not a field error", async () => {
    // A field error would say "this name is fine but that password is wrong",
    // which is the same leak by another route.
    const result = await authenticateLogin(NAME, "not-the-password");

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.state.errors).toBeUndefined();
    expect(result.ok === false && result.state.message).toBe(
      "Name or password is incorrect.",
    );
  });

  it("returns field errors for empty input, naming the field that is empty", async () => {
    const result = await authenticateLogin("", "");

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.state.errors).toEqual({
      name: ["Enter your name."],
      password: ["Enter your password."],
    });
  });

  it("treats a whitespace-only name as empty", async () => {
    // `formData.get` on an untouched box yields "", but a stray space is a
    // realistic paste and must not reach the lookup.
    const result = await authenticateLogin("   ", PASSWORD);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.state.errors?.name).toEqual([
      "Enter your name.",
    ]);
  });

  it("handles the null that FormData gives for a missing field", async () => {
    // `formData.get("name")` returns null, not undefined, when the field is
    // absent — a renamed input would otherwise 500 instead of erroring.
    const result = await authenticateLogin(null, null);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.state.errors?.name).toEqual([
      "Enter your name.",
    ]);
    expect(result.ok === false && result.state.errors?.password).toEqual([
      "Enter your password.",
    ]);
  });

  it("distinguishes an over-long value from an empty one", async () => {
    // Same field, different remedy: the copy has to say which.
    const longName = await authenticateLogin("n".repeat(65), PASSWORD);
    expect(longName.ok === false && longName.state.errors?.name).toEqual([
      "Name is too long.",
    ]);

    const longPassword = await authenticateLogin(NAME, "p".repeat(201));
    expect(longPassword.ok === false && longPassword.state.errors?.password).toEqual([
      "Password is too long.",
    ]);
  });

  it("does not authenticate on a valid name with the wrong password", async () => {
    // Guards the case where a lookup success is mistaken for a login success.
    const result = await authenticateLogin("staff", PASSWORD);
    expect(result.ok).toBe(false);
  });
});
