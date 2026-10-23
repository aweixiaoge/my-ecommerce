import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "@/lib/auth/password";
import {
  authenticateCustomer,
  closeSession,
  openSession,
  registerCustomer,
  sessionCustomer,
} from "./account-repo";
import { BROWSER_TTL_MS, REMEMBERED_TTL_MS, hashSessionToken } from "./session-token";

/**
 * Accounts and sessions, against a stand-in for the database — the lane has
 * no Postgres. What is asserted is what each call decides: what is stored
 * (a hash, never a password or a token), how long a session lives, and which
 * rows a token may reach.
 */
const db = vi.hoisted(() => ({
  customer: { create: vi.fn(), findUnique: vi.fn() },
  customerSession: { create: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn() },
  $transaction: vi.fn(async (operations: unknown[]) => Promise.all(operations)),
}));

vi.mock("@my-ecommerce/db", () => ({ prisma: db }));

const NOW = new Date("2026-10-21T12:00:00.000Z");
const PASSWORD = "correct horse battery";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registerCustomer", () => {
  it("stores a hash of the password, never the password, with the account's language", async () => {
    db.customer.create.mockResolvedValue({ id: "c_1", email: "ada@example.com" });

    const result = await registerCustomer(
      { email: "ada@example.com", password: PASSWORD, confirmPassword: PASSWORD },
      "de",
    );

    expect(result).toEqual({ status: "created", customer: { id: "c_1", email: "ada@example.com" } });
    const { data } = db.customer.create.mock.calls[0][0];
    expect(data.email).toBe("ada@example.com");
    expect(data.locale).toBe("de");
    expect(data.passwordHash).not.toContain(PASSWORD);
    expect(data).not.toHaveProperty("confirmPassword");
  });

  it("reports an address that already has an account, from the unique index", async () => {
    db.customer.create.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));

    expect(
      await registerCustomer({ email: "ada@example.com", password: PASSWORD, confirmPassword: PASSWORD }, "en"),
    ).toEqual({ status: "taken" });
  });

  it("lets any other failure through rather than calling it a taken address", async () => {
    db.customer.create.mockRejectedValue(new Error("connection lost"));

    await expect(
      registerCustomer({ email: "ada@example.com", password: PASSWORD, confirmPassword: PASSWORD }, "en"),
    ).rejects.toThrow("connection lost");
  });
});

describe("authenticateCustomer", () => {
  it("returns the customer for the right password, without the hash", async () => {
    db.customer.findUnique.mockResolvedValue({
      id: "c_1",
      email: "ada@example.com",
      passwordHash: await hashPassword(PASSWORD),
    });

    expect(await authenticateCustomer({ email: "ada@example.com", password: PASSWORD })).toEqual({
      id: "c_1",
      email: "ada@example.com",
    });
  });

  it("returns null for a wrong password", async () => {
    db.customer.findUnique.mockResolvedValue({
      id: "c_1",
      email: "ada@example.com",
      passwordHash: await hashPassword(PASSWORD),
    });

    expect(await authenticateCustomer({ email: "ada@example.com", password: "not it" })).toBeNull();
  });

  it("returns null for an unknown address — after paying for a hash all the same", async () => {
    db.customer.findUnique.mockResolvedValue(null);

    const started = performance.now();
    expect(await authenticateCustomer({ email: "nobody@example.com", password: PASSWORD })).toBeNull();
    // scrypt at its defaults takes tens of milliseconds; a skipped hash takes
    // well under one. The floor is loose so a fast machine cannot fail it.
    expect(performance.now() - started).toBeGreaterThan(5);
  });
});

describe("openSession", () => {
  it("stores the token's hash, and hands back the token itself", async () => {
    const { token } = await openSession("c_1", false, NOW);

    const { data } = db.customerSession.create.mock.calls[0][0];
    expect(data.tokenHash).toBe(hashSessionToken(token));
    expect(data.tokenHash).not.toBe(token);
    expect(data.customerId).toBe("c_1");
  });

  it("gives a browser session a day and a remembered one thirty", async () => {
    const browser = await openSession("c_1", false, NOW);
    const remembered = await openSession("c_1", true, NOW);

    expect(browser.expiresAt.getTime()).toBe(NOW.getTime() + BROWSER_TTL_MS);
    expect(remembered.expiresAt.getTime()).toBe(NOW.getTime() + REMEMBERED_TTL_MS);
  });

  it("mints a different token every time", async () => {
    const first = await openSession("c_1", false, NOW);
    const second = await openSession("c_1", false, NOW);

    expect(first.token).not.toBe(second.token);
  });

  it("clears only this customer's expired sessions on the way in", async () => {
    await openSession("c_1", false, NOW);

    expect(db.customerSession.deleteMany).toHaveBeenCalledWith({
      where: { customerId: "c_1", expiresAt: { lte: NOW } },
    });
  });
});

describe("sessionCustomer", () => {
  it("asks nothing without a token", async () => {
    expect(await sessionCustomer(undefined)).toBeNull();
    expect(db.customerSession.findFirst).not.toHaveBeenCalled();
  });

  it("finds the session by the token's hash, and only while it is live", async () => {
    db.customerSession.findFirst.mockResolvedValue({ customer: { id: "c_1", email: "ada@example.com" } });

    expect(await sessionCustomer("tok", NOW)).toEqual({ id: "c_1", email: "ada@example.com" });
    expect(db.customerSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashSessionToken("tok"), expiresAt: { gt: NOW } } }),
    );
  });

  it("is nobody for a token that names no live session", async () => {
    db.customerSession.findFirst.mockResolvedValue(null);

    expect(await sessionCustomer("old", NOW)).toBeNull();
  });
});

describe("closeSession", () => {
  it("deletes the row the token's hash names", async () => {
    await closeSession("tok");

    expect(db.customerSession.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: hashSessionToken("tok") },
    });
  });

  it("does nothing without a token", async () => {
    await closeSession(undefined);

    expect(db.customerSession.deleteMany).not.toHaveBeenCalled();
  });
});
