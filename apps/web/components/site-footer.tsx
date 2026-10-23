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
    <footer className="bg-mist">
      <div className="container-content grid grid-cols-1 gap-[50px] py-[70px] sm:grid-cols-3">
        <p className="text-[15px] leading-[19.5px] tracking-[-0.234px] text-ink">
          {messages.copyright}
        </p>

        {/*
          -ml cancels the first link's horizontal padding so its text optically
          aligns with the column edge — the same trick the design uses by
          positioning these links at x = -12.5.
        */}
        <nav className="-ml-[12.5px] flex flex-wrap items-start gap-y-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={item.prefetch}
              className="px-[12.5px] text-[13px] font-bold leading-[16.9px] tracking-[-0.076px] whitespace-nowrap text-ink"
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

  return <SocialLinks links={socialLinks(await getStoreContact())} />;
}
