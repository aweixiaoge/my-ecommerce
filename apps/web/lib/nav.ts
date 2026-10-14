/**
 * The primary navigation, shared by the header and the footer.
 *
 * Labels and order come from the design's Header (178:8787) and Footer
 * (178:8857) components, which carry the same seven items.
 *
 * Only "/" and "/cart" resolve today. The rest point at their intended paths —
 * which is why every link to them sets `prefetch={false}`: Next prefetches
 * eagerly, and six prefetches against unbuilt routes produce six 404s in the
 * console on every page load, burying real errors. Remove the flag on each
 * link as its route lands.
 */
export const NAV = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
  { label: "Journal", href: "/journal" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "My account", href: "/account" },
];
