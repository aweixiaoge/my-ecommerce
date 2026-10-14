import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin/session";
import { findAdminById } from "@/lib/mock/admin-users";
import { signOut } from "./actions";

/**
 * The post-sign-in landing page.
 *
 * Deliberately bare. It exists so the sign-in flow has somewhere real to land
 * and so there is an authenticated route to protect; the admin shell — sidebar,
 * navigation, sections — arrives with the first screen that needs it.
 */
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * The session read is request-time, and with `cacheComponents` enabled a
 * request read cannot be part of the prerendered shell. `instant = false` tells
 * the framework this segment is expected to block on the server rather than to
 * be validated for instant navigation — an admin page waiting on a session
 * check is correct behaviour, not something to optimise away.
 *
 * It also decides what a signed-out visitor sees. Streamed behind a `<Suspense>`
 * boundary the redirect cannot be a real one — the response has already started
 * — so Next falls back to a meta refresh, and the visitor gets a second of
 * "Loading…" before landing on the sign-in page. Blocking instead lets this
 * respond with a plain redirect before any HTML is sent.
 */
export const instant = false;

export default async function AdminPage() {
  const adminId = await getSession();

  // Also the answer to "what does a signed-out visitor see at /admin" — they
  // are sent to sign in rather than shown an empty page.
  if (!adminId) redirect("/admin/login");

  const admin = await findAdminById(adminId);

  // A session can outlive the account it points at. Send them to sign in rather
  // than render a half-built page.
  if (!admin) redirect("/admin/login");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-[360px]">
        <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
          Signed in
        </h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          {admin.name} · {admin.role}
        </p>

        <div className="mt-8 rounded-card border border-line p-5">
          <p className="text-[13px] leading-[21.45px] text-ink-62">
            The product, order and content screens land here as they are built.
          </p>
        </div>

        <form action={signOut} className="mt-8">
          <button
            type="submit"
            className="h-[44px] w-full rounded-control border border-ink text-[14px] font-medium text-ink transition-colors hover:bg-mist"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
