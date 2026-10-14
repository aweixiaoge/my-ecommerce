import { describe, expect, it } from "vitest";
import { AdminLoginSchema } from "./admin";

describe("AdminLoginSchema", () => {
  it("accepts a name and password", () => {
    expect(
      AdminLoginSchema.safeParse({ name: "admin", password: "hunter2" }).success,
    ).toBe(true);
  });

  it("trims the name, so surrounding whitespace cannot lock an admin out", () => {
    // A name pasted from a password manager routinely arrives padded. The
    // trimmed value is what the lookup uses, so trimming has to happen here,
    // in the shared contract, rather than at each call site.
    const result = AdminLoginSchema.safeParse({
      name: "  admin  ",
      password: "hunter2",
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data.name).toBe("admin");
  });

  it("rejects an empty or whitespace-only name", () => {
    for (const name of ["", " ", "\t\n"]) {
      expect(
        AdminLoginSchema.safeParse({ name, password: "hunter2" }).success,
      ).toBe(false);
    }
  });

  it("rejects an empty password", () => {
    expect(
      AdminLoginSchema.safeParse({ name: "admin", password: "" }).success,
    ).toBe(false);
  });

  it("does not enforce a password policy at login", () => {
    // Deliberate. A login form accepts whatever the account already has:
    // enforcing the creation policy here would lock out accounts that predate
    // a policy change, and would advertise the policy to an attacker. Length
    // rules belong on the change-password path.
    expect(
      AdminLoginSchema.safeParse({ name: "admin", password: "a" }).success,
    ).toBe(true);
  });

  it("rejects an over-length name or password, which is a work limit not a policy", () => {
    // The upper bounds exist so unbounded input never reaches a deliberately
    // expensive password hash.
    expect(
      AdminLoginSchema.safeParse({ name: "n".repeat(65), password: "hunter2" })
        .success,
    ).toBe(false);
    expect(
      AdminLoginSchema.safeParse({ name: "admin", password: "p".repeat(201) })
        .success,
    ).toBe(false);
  });

  it("rejects non-string fields and missing keys", () => {
    for (const input of [
      { name: 42, password: "hunter2" },
      { name: "admin", password: 42 },
      { name: null, password: "hunter2" },
      { name: "admin" },
      { password: "hunter2" },
      {},
    ]) {
      expect(AdminLoginSchema.safeParse(input).success).toBe(false);
    }
  });
});
