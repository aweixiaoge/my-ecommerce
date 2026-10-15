import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { findAdminById } from "@/lib/mock/admin-users";
import { getSession } from "@/lib/admin/session";

/**
 * The admin shell: the signed-in check, and the sidebar every admin screen
 * shares.
 *
 * The parentheses are load-bearing. `(shell)` is a route group, so it adds
 * nothing to the URL — `/admin`, `/admin/products` and everything after them
 * live here — but it keeps the sign-in page at `/admin/login` *outside* the
 * shell. Put this layout at `app/admin/layout.tsx` instead and the sign-in page
 * would inherit a sidebar with links you cannot follow until you have signed
 * in, and a "Sign out" button for a session that does not exist yet.
 *
 * The session check is here rather than in each page for the reason a shell
 * exists at all: one place to get it right. Every screen below this layout is
 * authenticated by construction, and a page that forgets to check — the
 * realistic bug — is still protected.
 */

/**
 * Signed-in pages are never indexed. Setting it here covers every screen in the
 * shell at once; a page below only has to name its own title.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The session read is request-time, and with `cacheComponents` enabled a
 * request read cannot be part of the prerendered shell. `instant = false` tells
 * the framework this segment is expected to block on the server rather than to
 * be validated for instant navigation — an admin page waiting on a session
 * check is correct behaviour, not something to optimise away.
 *
 * It also decides what a signed-out visitor sees. Streamed behind a
 * `<Suspense>` boundary the redirect cannot be a real one — the response has
 * already started — so Next falls back to a meta refresh, and the visitor gets
 * a second of "Loading…" before landing on the sign-in page. Blocking instead
 * lets this respond with a plain redirect before any HTML is sent.
 */
export const instant = false;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Nothing in the shell is prerenderable, and saying so is not optional:
  // `getSession` compares the session's expiry against the current time, and
  // the framework's prerender pass reports that `Date.now()` as an unstable
  // value in the dev overlay. `connection()` is the marker for "stop, this runs
  // at request time" — the read below then runs when there is a request, which
  // is the only time it was ever correct to run.
  await connection();

  const adminId = await getSession();

  // Also the answer to "what does a signed-out visitor see at /admin" — they
  // are sent to sign in rather than shown an empty shell.
  if (!adminId) redirect("/admin/login");

  const admin = await findAdminById(adminId);

  // A session can outlive the account it points at. Send them to sign in rather
  // than render a sidebar signed in as nobody.
  if (!admin) redirect("/admin/login");

  return (
    <div className="flex flex-1 items-stretch">
      <AdminSidebar admin={admin} />

      {/*
        The root `body` is a flex column, so `flex-1` on the shell fills the
        viewport height and the sidebar's own border runs the whole way down
        instead of stopping at the end of the content.
      */}
      <main className="min-w-0 flex-1 px-8 py-10">{children}</main>
    </div>
  );
}
