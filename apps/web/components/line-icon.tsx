import type { ReactNode } from "react";

/**
 * The storefront's line icons: drawn on a 20-unit box in `currentColor`, so a
 * parent's text colour sets theirs.
 *
 * `non-scaling-stroke` keeps the line at 1.5px whatever size the icon is drawn
 * at — at 36px a scaled stroke would be more than twice as heavy and read as
 * bold, and at 20px in the footer it would be the same weight as the 36px
 * ones on the Contact page.
 */
export function LineIcon({ children, size }: { children: ReactNode; size: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="[&_*]:[vector-effect:non-scaling-stroke]"
    >
      {children}
    </svg>
  );
}
