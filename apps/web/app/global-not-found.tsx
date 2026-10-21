import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Page not found",
    template: "%s · Smart Mall",
  },
};

/**
 * The 404 for a URL that matches no route at all.
 *
 * It is a root of its own — the document, the stylesheet — because the app now
 * has two root layouts and a root layout under a top-level dynamic segment,
 * which are the two cases the framework names as needing this file: there is no
 * single layout to compose a 404 from, and the framework skips rendering
 * entirely when nothing matches. `globals.css` is imported here for that
 * reason, and the markup below is the only chrome this page gets.
 *
 * English, deliberately: the language of the request is exactly what is unknown
 * here — there is no `[lang]` segment to read, because the URL did not match a
 * route. A localized 404 would need the proxy to resolve the language before
 * the framework gives up, which is a page that has to guess anyway.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <main className="container-content flex flex-1 flex-col justify-center py-24">
          <p className="text-[13px] font-bold tracking-[-0.076px] text-ink-55">
            404
          </p>
          <h1 className="pt-3 text-[32px] font-bold leading-[1.2] tracking-[-0.4px] text-ink">
            This page could not be found.
          </h1>
          <p className="pt-4 max-w-[560px] text-[15px] leading-[24px] text-ink-62">
            The address may be mistyped, or the page may have moved.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex h-11 w-fit items-center rounded-[3px] bg-ink px-6 text-[14px] font-semibold text-paper"
          >
            Go to the storefront
          </Link>
        </main>
      </body>
    </html>
  );
}
