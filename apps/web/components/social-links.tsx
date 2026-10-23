import Image from "next/image";
import type { SocialLink } from "@/lib/store-contact";

/**
 * The 15px social icons, 15px apart — the footer's and the Contact page's.
 *
 * Plain anchors to another site, so each opens in a new tab and carries
 * `noopener`. Renders nothing when the shop has no profiles set.
 */
export function SocialLinks({
  links,
  label,
  className = "",
}: {
  links: readonly SocialLink[];
  /** The group's accessible name. */
  label?: string;
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <nav aria-label={label} className={`flex items-center gap-[15px] ${className}`}>
      {links.map((social) => (
        <a
          key={social.label}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={social.label}
        >
          <Image src={social.src} alt="" width={15} height={15} />
        </a>
      ))}
    </nav>
  );
}
