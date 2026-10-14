import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * The storefront chrome.
 *
 * This lives here rather than in the root layout because the root layout wraps
 * *every* route, including `/admin`, and a nested layout cannot remove what a
 * parent renders. Keeping the chrome in this group is what lets the admin
 * render without a storefront header and footer.
 *
 * The fragment matters: the root `body` is a flex column, and returning the
 * three pieces at the top level makes them its direct children, so `flex-1` on
 * `<main>` still pushes the footer down.
 */
export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
