import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { listAdminUsers } from "@/lib/admin/admin-users-repo";
import { formatDate } from "@/lib/format";

/**
 * The admin accounts, and the button that makes one.
 *
 * Read at request time like the other admin lists.
 */
export const metadata: Metadata = {
  title: "User",
};

/** Allowed to block, for the reason the product list gives. */
export const instant = false;

export default async function AdminUsersPage() {
  await connection();

  const users = await listAdminUsers();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
            User
          </h1>
          <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
            {users.length === 1 ? "1 admin user." : `${users.length} admin users.`}
          </p>
        </div>

        <Link
          href="/admin/users/new"
          className="flex h-11 shrink-0 items-center rounded-control bg-ink px-5 text-[14px] font-medium text-paper transition-opacity hover:opacity-90"
        >
          Create user
        </Link>
      </div>

      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Every admin user.</caption>

        <thead>
          <tr className="border-b border-line">
            <Th>Username</Th>
            <Th>Role</Th>
            <Th>Created</Th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-line align-top">
              <td className="py-3 pr-4 text-[13px] font-medium leading-[21.45px] text-ink">
                {user.name}
                {user.devAccount && (
                  <span className="ml-2 rounded-control bg-mist px-2 py-0.5 text-[12px] font-normal leading-[19.8px] text-ink-62">
                    dev account
                  </span>
                )}
              </td>
              <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62 capitalize">
                {user.role}
              </td>
              <td className="py-3 pr-4 text-[13px] leading-[21.45px] text-ink-62">
                {user.createdAt ? formatDate(user.createdAt) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-2 pr-4 text-[12px] font-normal tracking-[0.5px] text-ink-55 uppercase">
      {children}
    </th>
  );
}
