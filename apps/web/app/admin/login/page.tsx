import type { Metadata } from "next";
import { AdminLoginForm } from "./login-form";

/**
 * Admin sign-in.
 *
 * A Server Component that reads no request data, so the page prerenders and
 * the form is interactive the moment it paints. Nothing here belongs to the
 * storefront: no header, no footer, no nav — `/admin` is a different app that
 * happens to share a build (plan.md, decision 6).
 */
export const metadata: Metadata = {
  title: "Admin sign in",
  // An admin route must never be indexed or followed. This is the page-level
  // guard; robots.txt is a separate, later concern (plan.md, phase 6).
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-[360px]">
        <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
          Admin
        </h1>
        <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
          Sign in to manage the store.
        </p>

        <div className="mt-8">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
