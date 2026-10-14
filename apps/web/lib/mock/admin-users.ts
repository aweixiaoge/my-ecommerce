import type { AdminRole } from "@my-ecommerce/shared";

/**
 * Mock admin store for the admin frontend.
 *
 * There is no `apps/api` and no database yet, so this stands in for the
 * `admin_users` table. Admin identity is deliberately NOT the customer table
 * (plan.md, decision 6) — nothing here may ever be merged with `lib/mock/`
 * customer data.
 *
 * The getter is async on purpose: it has the same signature the real API
 * client will have, so replacing this file is a swap, not a rewrite.
 *
 * DEV CREDENTIALS — these exist so the login page is exercisable locally and
 * have no meaning anywhere else. They must not survive contact with a real
 * deployment; the whole file goes when the API lands.
 *
 *   name: admin   password: admin-dev-password   (owner)
 *   name: staff   password: staff-dev-password   (staff)
 *
 * The hashes are real scrypt output, generated once with the same parameters
 * `lib/admin/password.ts` uses, so there is no hashing cost at import:
 *
 *   node -e "const{randomBytes,scryptSync}=require('node:crypto');
 *     const s=randomBytes(16);
 *     console.log(s.toString('base64')+':'+scryptSync(process.argv[1],s,64).toString('base64'))" '<password>'
 */

export interface AdminUserRecord {
  id: string;
  name: string;
  /** scrypt `salt:key`, base64. Never leaves the server. */
  passwordHash: string;
  role: AdminRole;
}

/**
 * Refuses to serve mock credentials in a production build.
 *
 * "The whole file goes when the API lands" is a promise, and promises are not
 * enforcement: the realistic failure is that the API is not ready, someone
 * deploys anyway, and the documented password above becomes a live admin login.
 * This is the line that turns that into a crash on the first request instead of
 * an incident.
 *
 * `nodeEnv` is a parameter so the guard itself can be tested. Nothing in the
 * app passes it.
 */
export function assertMockAdminStoreAllowed(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): void {
  if (nodeEnv === "production") {
    throw new Error(
      "The mock admin store is active in a production build. Replace " +
        "lib/mock/admin-users.ts with the real API client before deploying.",
    );
  }
}

const ADMIN_USERS: AdminUserRecord[] = [
  {
    id: "adm_01",
    name: "admin",
    passwordHash:
      "nzw2NKftOrZM14Ipycm3eQ==:9QogaAySS2Cwk41U06Ng+SNPES1VcaIyOywfm61zlo6PeVtPotxxJuIwFo3l+gRg4oUY2dI0EEqVoB2wI9OlOw==",
    role: "owner",
  },
  {
    id: "adm_02",
    name: "staff",
    passwordHash:
      "VKRCG8YCXOMh/0yZ4KPk4A==:ZKQ929T/eNJ+lJwhF5o2k90TFL5m74pggu8P1VAjZgTdPhfeewVDtNd2pLpZ3T9ZKBIKsO9zeM+yepAacfA8Qg==",
    role: "staff",
  },
];

/**
 * Looks up an admin by name.
 *
 * Case-insensitive and trimmed, matching the `citext` column the real
 * `admin_users` table will use — a name that differs only in case or padding
 * is the same account, and treating it otherwise would let two rows exist for
 * one person.
 */
export async function findAdminByName(
  name: string,
): Promise<AdminUserRecord | null> {
  assertMockAdminStoreAllowed();

  const needle = name.trim().toLowerCase();
  return (
    ADMIN_USERS.find((user) => user.name.toLowerCase() === needle) ?? null
  );
}

/**
 * Resolves the admin id a session carries back to the account.
 *
 * Sessions store an id, never a name or role, so a renamed admin or a changed
 * role takes effect on the next request instead of being frozen into a cookie
 * that stays valid for eight hours.
 */
export async function findAdminById(
  id: string,
): Promise<AdminUserRecord | null> {
  assertMockAdminStoreAllowed();

  return ADMIN_USERS.find((user) => user.id === id) ?? null;
}
