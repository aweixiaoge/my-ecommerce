import Image from "next/image";
import Link from "next/link";
import { NAV } from "@/lib/nav";

const SOCIALS = [
  { label: "Facebook", src: "/icons/social-facebook.svg" },
  { label: "Instagram", src: "/icons/social-instagram.svg" },
  { label: "YouTube", src: "/icons/social-youtube.svg" },
];

export function SiteFooter() {
  return (
    <footer className="bg-mist">
      <div className="container-content grid grid-cols-1 gap-[50px] py-[70px] sm:grid-cols-3">
        <p className="text-[15px] leading-[19.5px] tracking-[-0.234px] text-ink">
          Copyright © 2026 - Smart Mall
        </p>

        {/*
          -ml cancels the first link's horizontal padding so its text optically
          aligns with the column edge — the same trick the design uses by
          positioning these links at x = -12.5.
        */}
        <nav className="-ml-[12.5px] flex flex-wrap items-start gap-y-3">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              prefetch={false}
              className="px-[12.5px] text-[13px] font-bold leading-[16.9px] tracking-[-0.076px] whitespace-nowrap text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-start gap-[15px] sm:justify-end">
          {SOCIALS.map((social) => (
            <Link key={social.label} href="/" aria-label={social.label}>
              <Image src={social.src} alt="" width={15} height={15} />
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
