import Image from "next/image";
import type { ReactNode } from "react";
import { LineIcon } from "@/components/line-icon";
import type { SocialLink } from "@/lib/store-contact";

/**
 * The shop's social profiles — the footer's and the Contact page's — as line
 * icons in `currentColor`, so each caller sets their colour and hover with
 * `className` and their size with `size`.
 *
 * A network with no line icon below falls back to its own image from
 * `SOCIALS`, so a profile added there later still shows rather than vanishing.
 *
 * Plain anchors to another site, so each opens in a new tab and carries
 * `noopener`. Renders nothing when the shop has no profiles set.
 */
export function SocialLinks({
  links,
  label,
  size,
  className = "",
}: {
  links: readonly SocialLink[];
  /** The group's accessible name. */
  label?: string;
  /** The icon's box in px. */
  size: number;
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <nav aria-label={label} className={`flex items-center ${className}`}>
      {links.map((social) => {
        const paths = SOCIAL_PATHS[social.label];

        return (
          <a
            key={social.label}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label}
          >
            {paths ? (
              <LineIcon size={size}>{paths}</LineIcon>
            ) : (
              <Image src={social.src} alt="" width={size} height={size} />
            )}
          </a>
        );
      })}
    </nav>
  );
}

/** Keyed by `SocialLink.label`, which is the network's name, not copy. */
const SOCIAL_PATHS: Record<string, ReactNode> = {
  Facebook: (
    <path d="M11.5 17.5v-6.5h2.25l.35-2.6H11.5V6.8c0-.75.25-1.3 1.3-1.3h1.4V3.2a18 18 0 0 0-2.05-.1c-2 0-3.4 1.25-3.4 3.5v1.8H6.5V11h2.25v6.5" />
  ),
  Instagram: (
    <>
      <rect x="3" y="3" width="14" height="14" rx="4" />
      <circle cx="10" cy="10" r="3.25" />
      <circle cx="14.25" cy="5.75" r="0.4" />
    </>
  ),
  YouTube: (
    <>
      <rect x="2.5" y="4.75" width="15" height="10.5" rx="3" />
      <path d="m8.5 7.75 4 2.25-4 2.25Z" />
    </>
  ),
};
