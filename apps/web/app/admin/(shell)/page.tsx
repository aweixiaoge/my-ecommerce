import type { Metadata } from "next";

/**
 * The post-sign-in landing page.
 *
 * Deliberately bare. It exists so the sign-in flow has somewhere real to land
 * and so the shell has a screen to render on arrival; the dashboard proper
 * arrives with the first real screen.
 *
 * It reads no request data of its own — not even the session — because the
 * layout above it has already refused anyone unauthenticated. Re-checking here
 * would be a second source of truth for the same question.
 */
export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminPage() {
  return (
    <div className="max-w-[480px]">
      <h1 className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink">
        Admin
      </h1>
      <p className="mt-1 text-[14px] leading-[23.1px] tracking-[-0.15px] text-ink-60">
        Signed in. Pick a screen from the sidebar.
      </p>

      <div className="mt-8 rounded-card border border-line p-5">
        <p className="text-[13px] leading-[21.45px] text-ink-62">
          The product, order and content screens land here as they are built.
        </p>
      </div>
    </div>
  );
}
