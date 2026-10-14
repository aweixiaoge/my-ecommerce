import { describe, expect, it } from "vitest";
import {
  assertMockAdminStoreAllowed,
  findAdminById,
  findAdminByName,
} from "./admin-users";

describe("findAdminByName", () => {
  it("finds an admin by exact name", async () => {
    const user = await findAdminByName("admin");
    expect(user?.id).toBe("adm_01");
    expect(user?.role).toBe("owner");
  });

  it("matches regardless of case or surrounding whitespace", async () => {
    // The real column is citext and the input comes from a form, so "  Admin "
    // and "admin" are the same account. Treating them as different would let
    // one person end up with two rows.
    for (const name of ["ADMIN", "Admin", "  admin  ", "\tadmin"]) {
      await expect(findAdminByName(name)).resolves.toMatchObject({ id: "adm_01" });
    }
  });

  it("returns null for a name that is not in the store", async () => {
    await expect(findAdminByName("nobody")).resolves.toBeNull();
  });

  it("returns null for an empty or whitespace-only name", async () => {
    for (const name of ["", "   "]) {
      await expect(findAdminByName(name)).resolves.toBeNull();
    }
  });

  it("stores hashes, never plaintext", async () => {
    // Guards the one thing the mock store must never do. If a plaintext
    // password ever appears here, it will be committed.
    const user = await findAdminByName("admin");
    expect(user).not.toBeNull();
    expect(user!.passwordHash).not.toContain("admin-dev-password");
    expect(user!.passwordHash).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
  });
});

describe("findAdminById", () => {
  it("resolves the id a session carries back to the account", async () => {
    await expect(findAdminById("adm_02")).resolves.toMatchObject({
      name: "staff",
      role: "staff",
    });
  });

  it("returns null for an id that is not in the store", async () => {
    // A session can outlive the account it points at, so the caller has to
    // handle a miss rather than assume a user comes back.
    await expect(findAdminById("adm_gone")).resolves.toBeNull();
  });
});

describe("the production guard", () => {
  it("refuses to serve the mock store in a production build", () => {
    // The realistic failure this prevents: the API is not ready, someone
    // deploys anyway, and the password documented above becomes a live login.
    expect(() => assertMockAdminStoreAllowed("production")).toThrow(
      /mock admin store is active in a production build/,
    );
  });

  it("allows every other environment", () => {
    for (const env of ["development", "test", undefined]) {
      expect(() => assertMockAdminStoreAllowed(env)).not.toThrow();
    }
  });

  it("is actually wired into the lookups, not merely defined", async () => {
    // A guard nothing calls protects nothing. Set the real environment
    // variable rather than passing the parameter, so this fails if the call
    // sites are removed.
    // `@types/node` declares NODE_ENV readonly; it is writable at runtime.
    const env = process.env as Record<string, string | undefined>;
    const original = env.NODE_ENV;
    env.NODE_ENV = "production";
    try {
      await expect(findAdminByName("admin")).rejects.toThrow();
      await expect(findAdminById("adm_01")).rejects.toThrow();
    } finally {
      env.NODE_ENV = original;
    }
  });
});

describe("admin store invariants", () => {
  it("keeps ids and names unique", async () => {
    // A duplicate name would make the login lookup depend on array order.
    const ids = new Set<string>();
    const names = new Set<string>();

    for (const probe of ["admin", "staff"]) {
      const user = await findAdminByName(probe);
      expect(user).not.toBeNull();
      ids.add(user!.id);
      names.add(user!.name.toLowerCase());
    }

    expect(ids.size).toBe(2);
    expect(names.size).toBe(2);
  });
});
