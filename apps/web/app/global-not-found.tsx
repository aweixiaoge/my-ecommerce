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
        <main className="container-content flex flex-1 flex-col items-center justify-center py-24 text-center">
          <p className="text-[11px] leading-4 font-medium tracking-[0.22em] text-gold uppercase">
            404
          </p>
          <h1 className="pt-4 font-display text-[36px] leading-[44px] font-normal text-ink sm:text-[44px] sm:leading-[52px]">
            This page could not be found.
          </h1>
          <div aria-hidden className="mt-5 h-px w-8 bg-gold/50" />
          <p className="max-w-[560px] pt-6 text-[15px] leading-[27px] text-ink-62">
            The address may be mistyped, or the page may have moved.
          </p>
          <Link
            href="/"
            className="mt-10 inline-flex h-[46px] w-fit items-center justify-center border border-ink bg-ink px-8 text-[13px] leading-5 font-medium tracking-[0.14em] text-paper transition-colors duration-300 hover:bg-paper hover:text-ink"
          >
            Go to the storefront
          </Link>
        </main>
      </body>
    </html>
  );
}
