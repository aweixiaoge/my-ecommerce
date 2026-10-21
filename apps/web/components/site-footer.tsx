import Image from "next/image";
import Link from "next/link";
import type { Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/languages";

/*
 * Social network names, which are the same in every language — a proper noun
 * that happened to be coined in English. They are labels, not copy, so they do
 * not belong in a catalog.
 */
const SOCIALS = [
  { label: "Facebook", src: "/icons/social-facebook.svg" },
  { label: "Instagram", src: "/icons/social-instagram.svg" },
  { label: "YouTube", src: "/icons/social-youtube.svg" },
];

export function SiteFooter({
  nav,
  messages,
  locale,
}: {
  /** The seven routes, labelled and addressed for this locale — resolved once
   *  in `app/[lang]/layout.tsx` and shared with the header. */
  nav: readonly { label: string; href: string; prefetch: boolean }[];
  /** This locale's `footer` slice of the catalog. */
  messages: Messages["footer"];
  locale: Locale;
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

        <div className="flex items-start gap-[15px] sm:justify-end">
          {SOCIALS.map((social) => (
            /* The profiles do not exist yet, so the address is the page's own
               language root — the same placeholder the currency switcher uses.
               Left bare, a reader on `/de` would be sent to `/en` by the proxy
               and lose the language they were reading in. */
            <Link
              key={social.label}
              href={localePath(locale, "/")}
              aria-label={social.label}
            >
              <Image src={social.src} alt="" width={15} height={15} />
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
