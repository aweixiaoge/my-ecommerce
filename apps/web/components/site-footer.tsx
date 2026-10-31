import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { SocialLinks } from "@/components/social-links";
import { getStoreContact } from "@/lib/contact/store-contact-repo";
import type { Messages } from "@/lib/i18n/messages";
import { socialLinks } from "@/lib/store-contact";

export function SiteFooter({
  nav,
  messages,
}: {
  /** The seven routes, labelled and addressed for this locale — resolved once
   *  in `app/[lang]/layout.tsx` and shared with the header. */
  nav: readonly { label: string; href: string; prefetch: boolean }[];
  /** This locale's `footer` slice of the catalog. */
  messages: Messages["footer"];
}) {
  return (
    // Ivory under a hairline, in the storefront's luxury register: the links
    // as small tracked capitals — the footer wraps, so unlike the header it
    // can afford them — and the copyright as quiet grey print.
    <footer className="border-t border-line bg-ivory">
      <div className="container-content grid grid-cols-1 gap-[44px] py-[72px] sm:grid-cols-3">
        <p className="text-[12px] leading-[19.5px] tracking-[0.06em] text-ink-55">
          {messages.copyright}
        </p>

        {/*
          -ml cancels the first link's horizontal padding so its text optically
          aligns with the column edge — the same trick the design uses by
          positioning these links at x = -12.5.
        */}
        <nav className="-ml-[12.5px] flex flex-wrap items-start gap-y-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={item.prefetch}
              className="px-[12.5px] text-[11px] font-medium leading-[16.9px] tracking-[0.18em] whitespace-nowrap text-ink-62 uppercase transition-colors duration-300 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/*
          The profiles are the admin's Contact → Info links, read per request —
          so behind a boundary, as every request-time read in the shared
          chrome is. The fallback is the empty column, the same size.
        */}
        <div className="flex items-start sm:justify-end">
          <Suspense fallback={null}>
            <FooterSocials />
          </Suspense>
        </div>
      </div>
    </footer>
  );
}

async function FooterSocials() {
  await connection();

  // The Contact page's line icons at the Contact page's 30px, in the footer
  // links' grey.
  return (
    <SocialLinks
      links={socialLinks(await getStoreContact())}
      size={30}
      className="gap-[24px] [&_a]:text-ink-62 [&_a]:transition-colors [&_a]:duration-300 [&_a:hover]:text-ink"
    />
  );
}
