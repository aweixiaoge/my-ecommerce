import type { Metadata } from "next";
import "../globals.css";

/**
 * The admin's root layout.
 *
 * A second root, alongside the storefront's, because the storefront's now sits
 * under `[lang]` and everything below a root inherits its document — an admin
 * under the storefront root would have to declare a language it does not have
 * (the admin is English, one locale, `lib/locale.ts`'s default) and would move
 * to `/de/admin` with no way to take it back off. Two roots is what keeps
 * `/admin` exactly where it was: unprefixed, unlocalized, and outside the
 * storefront's chrome.
 *
 * The title template is repeated here rather than shared, because metadata does
 * not cross a root boundary: without it every admin screen would lose the
 * "· Smart Mall" its title has today. The sign-in screen and the shell below
 * carry the rest of the admin's metadata.
 */
export const metadata: Metadata = {
  title: {
    default: "Smart Mall",
    template: "%s · Smart Mall",
  },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}
