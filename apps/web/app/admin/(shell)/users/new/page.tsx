import type { Metadata } from "next";
import Link from "next/link";
import { AdminUserForm } from "@/components/admin/admin-user-form";

/**
 * The create-user screen.
 *
 * A route rather than a dialog on the list, for the reason the category one
 * gives: it can be linked to and reloaded.
 */
export const metadata: Metadata = {
  title: "New user",
};

export default function AdminNewUserPage() {
  return (
    <div className="flex max-w-[640px] flex-col gap-8">
      <div>
        <Link
          href="/admin/users"
          className="text-[12px] leading-[19.8px] text-ink-55 transition-colors hover:text-ink"
        >
          ← Users
        </Link>

        <h1 className="mt-2 text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
          New user
        </h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          A username and password for signing in to the admin. New users are staff.
        </p>
      </div>

      <AdminUserForm />
    </div>
  );
}
