import { describe, expect, it } from "vitest";
import {
  ACCOUNT_PASSWORD_MAX,
  ACCOUNT_PASSWORD_MIN,
  AccountLoginSchema,
  AccountRegisterSchema,
} from "./account";

const issuesAt = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  (result.error?.issues ?? []).map((issue) => issue.path.join("."));

describe("AccountLoginSchema", () => {
  it("folds the email so two spellings of one address are one account", () => {
    const result = AccountLoginSchema.parse({
      email: "  Ada@Example.COM ",
      password: "x",
      remember: false,
    });

    expect(result.email).toBe("ada@example.com");
  });

  it("accepts any non-empty password, however short — the policy is the register form's", () => {
    expect(AccountLoginSchema.safeParse({ email: "a@b.co", password: "1", remember: true }).success).toBe(true);
  });

  it("refuses an empty password and a malformed email, naming each", () => {
    const result = AccountLoginSchema.safeParse({ email: "not-an-email", password: "", remember: false });

    expect(issuesAt(result).sort()).toEqual(["email", "password"]);
  });
});

describe("AccountRegisterSchema", () => {
  const password = "a".repeat(ACCOUNT_PASSWORD_MIN);

  it("accepts a matching pair at the minimum length", () => {
    const result = AccountRegisterSchema.safeParse({
      email: "Ada@Example.com",
      password,
      confirmPassword: password,
    });

    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("ada@example.com");
  });

  it("refuses a password one short of the minimum", () => {
    const short = "a".repeat(ACCOUNT_PASSWORD_MIN - 1);
    const result = AccountRegisterSchema.safeParse({ email: "a@b.co", password: short, confirmPassword: short });

    expect(issuesAt(result)).toEqual(["password"]);
  });

  it("refuses a password over the ceiling, which feeds an expensive hash", () => {
    const long = "a".repeat(ACCOUNT_PASSWORD_MAX + 1);
    const result = AccountRegisterSchema.safeParse({ email: "a@b.co", password: long, confirmPassword: long });

    expect(issuesAt(result)).toContain("password");
  });

  it("puts a mismatch on the confirmation box, where the form shows it", () => {
    const result = AccountRegisterSchema.safeParse({
      email: "a@b.co",
      password,
      confirmPassword: `${password}!`,
    });

    expect(issuesAt(result)).toEqual(["confirmPassword"]);
  });
});
