import Link from "next/link";
import type { AdminUser } from "@my-ecommerce/shared";
import { signOut } from "@/app/admin/actions";
import { AdminNav } from "./admin-nav";

/**
 * The admin's left sidebar: brand, navigation, and the account block.
 *
 * The account block is why sign-out lives here rather than on a page. An admin
 * has to be able to sign out from wherever they are, and a sign-out button on
 * one screen only is a trap: the moment a second screen exists, someone is
 * stuck on it, signed in, with no way out but clearing cookies by hand.
 *
 * It takes the shape of the shell `AdminUser` — id, name, role — not the mock
 * record behind it, so this keeps working when the mock store is replaced by
 * the API and stops carrying a password hash around in a props type.
 */
export function AdminSidebar({ admin }: { admin: AdminUser }) {
  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-line bg-paper">
      <div className="flex h-[72px] flex-col justify-center px-4">
        <Link
          href="/admin"
          className="text-[15px] font-bold leading-[22.5px] tracking-[-0.076px] text-ink"
        >
          Smart Mall
        </Link>
        <p className="text-[11px] leading-[16.5px] tracking-[0.5px] text-ink-55 uppercase">
          Admin
        </p>
      </div>

      {/* Scrolls on its own, so a long nav never pushes sign-out off screen. */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <AdminNav />
      </div>

      <div className="border-t border-line p-3">
        <p className="truncate px-1 text-[12px] leading-[19.8px] text-ink-62">
          {admin.name} · {admin.role}
        </p>

        {/*
          A Server Action, not a link — the same reasoning as on the sign-in
          page's neighbour: a GET that signs you out can be fired by any image
          tag on any page, and this one invalidates the session server-side.
        */}
        <form action={signOut} className="mt-2">
          <button
            type="submit"
            className="h-9 w-full rounded-control border border-line text-[13px] font-medium text-ink transition-colors hover:bg-mist"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
