import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyPassword } from "@/lib/auth/password";
import {
  createAdminUser,
  DuplicateAdminNameError,
  findAdminById,
  findAdminByName,
  listAdminUsers,
} from "./admin-users-repo";

/**
 * The admin accounts, against a stand-in for the table and the real mock
 * store — the lane has no database, and the dev accounts are part of what the
 * repository promises to return.
 */
const db = vi.hoisted(() => ({
  adminUser: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@my-ecommerce/db", () => ({ prisma: { adminUser: db.adminUser } }));

const ROW = {
  id: "row_1",
  name: "Jane",
  passwordHash: "salt:key",
  role: "staff" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  db.adminUser.findFirst.mockResolvedValue(null);
  db.adminUser.findUnique.mockResolvedValue(null);
  db.adminUser.findMany.mockResolvedValue([]);
  db.adminUser.create.mockResolvedValue({ id: "row_new" });
});

describe("findAdminByName", () => {
  it("returns a table row, matched ignoring case and padding", async () => {
    db.adminUser.findFirst.mockResolvedValue(ROW);

    expect(await findAdminByName("  JANE ")).toEqual(ROW);
    expect(db.adminUser.findFirst.mock.calls[0][0].where).toEqual({
      name: { equals: "JANE", mode: "insensitive" },
    });
  });

  it("falls back to a dev account outside production", async () => {
    expect((await findAdminByName("admin"))?.id).toBe("adm_01");
  });

  it("never returns a dev account in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(await findAdminByName("admin")).toBeNull();
  });
});

describe("findAdminById", () => {
  it("prefers the table, then the dev accounts", async () => {
    db.adminUser.findUnique.mockResolvedValueOnce(ROW);
    expect(await findAdminById("row_1")).toEqual(ROW);
    expect((await findAdminById("adm_02"))?.name).toBe("staff");
  });
});

describe("listAdminUsers", () => {
  it("lists the dev accounts, then the rows, without a password hash", async () => {
    db.adminUser.findMany.mockResolvedValue([
      { id: "row_1", name: "Jane", role: "staff", createdAt: new Date("2026-10-22T10:00:00Z") },
    ]);

    const users = await listAdminUsers();

    expect(users).toEqual([
      { id: "adm_01", name: "admin", role: "owner", createdAt: null, devAccount: true },
      { id: "adm_02", name: "staff", role: "staff", createdAt: null, devAccount: true },
      {
        id: "row_1",
        name: "Jane",
        role: "staff",
        createdAt: "2026-10-22T10:00:00.000Z",
        devAccount: false,
      },
    ]);
    expect(JSON.stringify(users)).not.toContain("passwordHash");
  });

  it("shows only rows in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(await listAdminUsers()).toEqual([]);
  });
});

describe("createAdminUser", () => {
  it("stores a staff account with a hash that verifies, never the password", async () => {
    await createAdminUser({ name: "jane", password: "long-enough" });

    const data = db.adminUser.create.mock.calls[0][0].data;
    expect(data.name).toBe("jane");
    expect(data.role).toBe("staff");
    expect(data.passwordHash).not.toContain("long-enough");
    expect(await verifyPassword("long-enough", data.passwordHash)).toBe(true);
  });

  it("refuses a name a row already has, ignoring case", async () => {
    db.adminUser.findFirst.mockResolvedValue(ROW);
    await expect(createAdminUser({ name: "jane", password: "long-enough" })).rejects.toThrow(
      DuplicateAdminNameError,
    );
    expect(db.adminUser.create).not.toHaveBeenCalled();
  });

  it("refuses a dev account's name", async () => {
    await expect(createAdminUser({ name: "Admin", password: "long-enough" })).rejects.toThrow(
      DuplicateAdminNameError,
    );
  });

  it("turns a unique-index race into the same refusal", async () => {
    db.adminUser.create.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    await expect(createAdminUser({ name: "jane", password: "long-enough" })).rejects.toThrow(
      DuplicateAdminNameError,
    );
  });
});
