/**
 * The storefront's own copy, in English.
 *
 * This file is the source of truth for the shape: `Messages` is
 * `typeof en`, and every other catalog is written `satisfies Messages`, so a
 * key added here and forgotten there is a typecheck failure rather than a
 * blank line at runtime. Nothing else may be added to a page's markup — a
 * string that is not in a catalog is a string that cannot be translated.
 *
 * Two things are deliberately *not* here:
 *
 * - Catalogue content — product, category and blog text comes from the
 *   database, one row per language, and falls back to English where a
 *   translation has not been written (`lib/catalog/*`).
 * - Names that do not translate: the brand (`Smart Mall`), currency codes
 *   (`USD`), SKU, and the social network labels in the footer. Those are
 *   proper nouns in every language, and translating them would be a bug.
 *
 * Interpolation is `{name}` rather than a function, so a catalog stays a plain
 * serializable object that can be handed to a client component. Write `{count}`
 * only through `plural` (`lib/i18n/format.ts`), which is where the singular is
 * chosen — all five languages here take the same two forms, one and other.
 */
export const en = {
  nav: {
    home: "Home",
    shop: "Shop",
    about: "About",
    journal: "Journal",
    contact: "Contact",
    faq: "FAQ",
    account: "My account",
  },

  header: {
    brand: "Smart Mall",
    cart: "Cart",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    mobileNav: "Mobile",
    /** The switcher's accessible name; `{code}` is the two-letter language. */
    language: "Language: {code}",
    /**
     * The currency switcher's, and `{code}` is the three-letter code — `USD`,
     * not "US Dollar". The codes themselves are proper nouns and stay as they
     * are in every catalog; only this sentence around one is translated.
     */
    currency: "Currency: {code}",
  },

  footer: {
    copyright: "Copyright © 2026 - Smart Mall",
  },

  /**
   * What a search engine shows for the site itself — the home page's
   * description, and the fallback for any page without one of its own.
   */
  meta: {
    description:
      "Hand-tested audio gear — earbuds, earphones and headphones, tested by our own team before they reach your cart.",
  },

  hero: {
    eyebrow: "Hand-tested audio gear",
    fallbackTitle: "Sound that keeps up with your day.",
    fallbackBody:
      "Wireless earbuds, earphones and headphones — every one of them tested by our own team before it reaches your cart.",
    ctaProduct: "Shop it now",
    ctaFallback: "Shop all products",
    story: "Read our story",
    imageAlt: "Wireless over-ear headphones on a shoreline",
  },

  /** Four promises. The first names an amount, because money is not a string. */
  trustBar: [
    {
      title: "Free shipping over {amount}",
      body: "Standard delivery in 5–7 business days.",
    },
    {
      title: "30-day returns",
      body: "Changed your mind? Send it back for a full refund.",
    },
    {
      title: "Hand-tested products",
      body: "Every item is used and critiqued by our team first.",
    },
    {
      title: "Real support",
      body: "Questions before or after you buy? Talk to us.",
    },
  ],

  arrivals: {
    title: "New arrivals",
    link: "View all products →",
  },

  whyBuy: {
    eyebrow: "Why buy from us",
    title: "We use the gear before we sell it.",
    body: "Nothing lands in the catalogue until it has been through our own ears — battery life measured, fit tested, calls taken on a busy street. If it doesn’t hold up, we don’t stock it.",
    cta: "More about us",
    imageAlt: "A pair of headphones on a ridged surface",
  },

  journal: {
    title: "From the journal",
    link: "All articles →",
  },

  contact: {
    title: "Not sure which pair is right for you?",
    body: "Tell us how you listen and we’ll point you at the right model — or start with the questions everyone asks.",
    contact: "Contact us",
    faq: "Read the FAQ",
  },

  shop: {
    title: "Shop",
    description:
      "Every earbud, earphone and headphone we stock — hand-tested by our own team before it reaches your cart.",
    bannerTitle: "Hand-tested gear",
    bannerBody:
      "Every pair that reaches this page has been worn by someone here first. Battery life measured across a week of commutes, fit checked on a run, calls taken on a busy street. The ones that did not hold up never made it into the catalogue — and what we learned testing them is in the journal.",
    bannerCta: "Learn more",
    bannerImageAlt: "A pair of headphones on a ridged surface",
  },

  listing: {
    results: "Showing {from}–{to} of {total} results",
    noResults: "No results",
    sortLabel: "Sort products",
    sortApply: "Apply sorting",
    /** The four orders `?sort=` accepts, keyed as `lib/shop.ts` keys them. */
    sort: {
      default: "Default sorting",
      priceAsc: "Price, low to high",
      priceDesc: "Price, high to low",
      nameAsc: "Name, A to Z",
    },
    pagination: "Pagination",
    next: "Next",
    emptyCategory: "Nothing is filed in this category yet.",
    /** The shop card's button. Its capital C is the design's. */
    addToCart: "Add to Cart",
  },

  product: {
    breadcrumb: "Breadcrumb",
    home: "Home",
    description: "Description",
    reviews: "Reviews ({count})",
    related: "Related products",
    imageAlt: "Show image of {name}",
    /** The singular/plural pair for the line under the stars. */
    reviewCount: {
      one: "{count} customer review",
      other: "{count} customer reviews",
    },
    unavailable: "Unavailable in this combination",
    addToCart: "Add to cart",
    cartNote: "Cart is wired up in Phase 2.",
    sku: "SKU:",
    category: "Category:",
    /** Between the low and high price of a ranged product. */
    rangeSeparator: " – ",
  },

  reviews: {
    empty: "No reviews yet.",
    listTitle: {
      one: "{count} review for {product}",
      other: "{count} reviews for {product}",
    },
    singleRating: "Rated {rating} out of 5",
    summary: "Rated {average} out of 5 from {count} reviews",
    form: {
      title: "Add a review",
      /** The required marker is drawn by the component, in the design's red. */
      note: "Your email address will not be published. Required fields are marked",
      rating: "Your rating",
      star: { one: "{count} star", other: "{count} stars" },
      name: "Name",
      email: "Email",
      body: "Your review",
      submit: "Submit",
      sending: "Sending…",
      thanks:
        "Thanks — your review is with us. It will appear here once it has been approved.",
    },
    errors: {
      productUnknown: "That product could not be identified. Reload and try again.",
      saveFailed:
        "Your review could not be saved. Try again, and check the server is running if it keeps failing.",
      productUnavailable:
        "That product is no longer available, so there is nothing to review.",
      nameRequired: "Enter your name.",
      nameTooLong: "Name is too long.",
      emailInvalid: "Enter a valid email address.",
      emailTooLong: "Email is too long.",
      ratingRange: "Choose between 1 and 5 stars.",
      bodyRequired: "Write your review.",
      bodyTooLong: "Your review is too long.",
    },
  },

  cart: {
    title: "Cart",
    heading: "Your cart",
    empty: "Your cart is empty.",
    continue: "Continue shopping",
  },
};
