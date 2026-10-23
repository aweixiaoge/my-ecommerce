import { prisma } from "@my-ecommerce/db";
import type { AdminRole, AdminUserCreateInput } from "@my-ecommerce/shared";
import { hashPassword } from "@/lib/auth/password";
import {
  findAdminById as findMockAdminById,
  findAdminByName as findMockAdminByName,
  listMockAdmins,
  type AdminUserRecord,
} from "../mock/admin-users";

/**
 * The admin accounts: the `admin_users` table, and — outside a production
 * build — the two dev accounts in `lib/mock/admin-users.ts` beside it.
 *
 * The mock accounts stay so a fresh database can still be signed into: there
 * is no other way to make the first admin. They are read only when the mock
 * store allows it, which it never does in production, so its documented
 * passwords cannot become live logins there. A table row wins over a mock
 * account of the same name, and creating one with a mock account's name is
 * refused, so the two never meet in practice.
 */

/** Another account already has this name, ignoring case. */
export class DuplicateAdminNameError extends Error {
  constructor() {
    super("Another admin already uses this name.");
    this.name = "DuplicateAdminNameError";
  }
}

function mockStoreAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}

const RECORD_SELECT = {
  id: true,
  name: true,
  passwordHash: true,
  role: true,
} as const;

/**
 * Looks up an admin by name, case-insensitively and trimmed, as the mock store
 * always has — a name that differs only in case is the same account.
 */
export async function findAdminByName(name: string): Promise<AdminUserRecord | null> {
  const row = await prisma.adminUser.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
    select: RECORD_SELECT,
  });
  if (row) return row;

  return mockStoreAllowed() ? findMockAdminByName(name) : null;
}

/** Resolves the admin id a session carries back to the account. */
export async function findAdminById(id: string): Promise<AdminUserRecord | null> {
  const row = await prisma.adminUser.findUnique({
    where: { id },
    select: RECORD_SELECT,
  });
  if (row) return row;

  return mockStoreAllowed() ? findMockAdminById(id) : null;
}

/** One admin, as the user list draws it. Never the password hash. */
export interface AdminUserSummary {
  id: string;
  name: string;
  role: AdminRole;
  /** ISO. Null for a dev account, which has no row and so no creation date. */
  createdAt: string | null;
  /** A dev account from the mock store rather than a table row. */
  devAccount: boolean;
}

/** Every admin: the dev accounts first, then the table's, oldest first. */
export async function listAdminUsers(): Promise<AdminUserSummary[]> {
  const rows = await prisma.adminUser.findMany({
    select: { id: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const mocks = mockStoreAllowed() ? await listMockAdmins() : [];
  const rowNames = new Set(rows.map((row) => row.name.toLowerCase()));

  return [
    ...mocks
      .filter((mock) => !rowNames.has(mock.name.toLowerCase()))
      .map((mock) => ({
        id: mock.id,
        name: mock.name,
        role: mock.role,
        createdAt: null,
        devAccount: true,
      })),
    ...rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      devAccount: false,
    })),
  ];
}

/**
 * Creates a staff admin. The form has no role field, so nobody can make
 * another owner from it.
 *
 * The name is checked against every account first, ignoring case, because the
 * unique index compares exactly and sign-in does not; the index still catches
 * two saves of the same spelling racing each other.
 */
export async function createAdminUser(
  input: Pick<AdminUserCreateInput, "name" | "password">,
): Promise<{ id: string }> {
  if (await findAdminByName(input.name)) throw new DuplicateAdminNameError();

  const passwordHash = await hashPassword(input.password);

  try {
    return await prisma.adminUser.create({
      data: { name: input.name, passwordHash, role: "staff" },
      select: { id: true },
    });
  } catch (error) {
    if ((error as { code?: unknown } | null)?.code === "P2002") {
      throw new DuplicateAdminNameError();
    }
    throw error;
  }
}
