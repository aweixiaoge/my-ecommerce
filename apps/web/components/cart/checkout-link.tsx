import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The way to checkout, from the header's cart panel and from the cart page.
 *
 * A link while there is something to buy. When every line has an issue — sold
 * out, withdrawn, more than is left — the cart has nothing the checkout would
 * order, so the button is drawn dimmed and goes nowhere: the cart lines above
 * it say why. It is a `<span>` with `aria-disabled` then, because a link cannot
 * be disabled and a link that leads to "your cart is empty" is a dead end.
 */
export function CheckoutLink({
  href,
  enabled,
  className,
  children,
}: {
  href: string;
  enabled: boolean;
  className: string;
  children: ReactNode;
}) {
  if (!enabled) {
    return (
      <span aria-disabled="true" className={`${className} cursor-not-allowed opacity-40`}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
