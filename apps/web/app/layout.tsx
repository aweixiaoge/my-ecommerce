import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Smart Mall",
    template: "%s · Smart Mall",
  },
  description:
    "Hand-tested audio gear — earbuds, earphones and headphones, tested by our own team before they reach your cart.",
};

/**
 * Only what is genuinely global to every route lives here — the document, the
 * stylesheet, and the metadata that is the *default* for the whole site.
 *
 * The storefront's header and footer are NOT here: they would wrap the admin
 * too, and no nested layout can take them back off. They live in
 * `app/(storefront)/layout.tsx` instead.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-paper text-ink">
        {children}
      </body>
    </html>
  );
}
