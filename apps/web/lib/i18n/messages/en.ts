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
    /** The cart link's name once something is in it — the badge read aloud. */
    cartCount: {
      one: "Cart, {count} item",
      other: "Cart, {count} items",
    },
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

  /** The Journal page (Figma 178:2586): every post, newest first. */
  journalPage: {
    title: "Journal",
    description: "Guides, comparisons and notes from the people who test our earphones and headphones.",
    empty: "No articles yet — check back soon.",
  },

  /** A post's own page. */
  journalPost: {
    back: "Back to the journal",
  },

  gallery: {
    previous: "Previous image",
    next: "Next image",
    show: "Show image {n} of {total}",
  },

  contact: {
    title: "Not sure which pair is right for you?",
    body: "Tell us how you listen and we’ll point you at the right model — or start with the questions everyone asks.",
    contact: "Contact us",
    faq: "Read the FAQ",
  },

  /** The Contact page (Figma 178:7601). */
  contactPage: {
    title: "Contact",
    description: "Questions about an order or a product? Write to us and we’ll get back to you.",
    intro: "Any question? Write to us and we’ll reply as soon as we can.",
    name: "Name",
    namePlaceholder: "Your Name",
    email: "Email",
    emailPlaceholder: "Email Address",
    subject: "Subject",
    subjectPlaceholder: "Subject",
    message: "Your Message",
    messagePlaceholder: "Your Message",
    /** Read aloud for the red asterisk beside a label. */
    required: "required",
    submit: "Submit Form",
    sending: "Sending…",
    sent: "Thanks — your message is on its way. We’ll reply by email.",
    sendAnother: "Send another message",
    getInTouch: "Get in Touch",
    /** The labels before each way of reaching the shop; the values are not copy. */
    tel: "tel:",
    emailLabel: "email:",
    whatsapp: "whatsapp:",
    address: "address:",
    /** The social links' accessible group name. */
    social: "Follow us",
    errors: {
      required: "Please fill in this field.",
      email: "Enter a valid email address.",
      tooLong: "This is too long.",
      failed: "Something went wrong. Please try again.",
    },
  },

  /** The FAQ page; its body is the admin's Contact → FAQ description. */
  /** The About page: the copy and images written under Contact → About. */
  aboutPage: {
    title: "About us",
    description: "Who we are, and why we test every piece of gear before we sell it.",
    /** Shown while the admin has written nothing. */
    empty: "We haven’t written our story yet.",
    contact: "Say hello on the Contact page",
  },

  faqPage: {
    title: "FAQ",
    description: "Answers to the questions we hear most — shipping, returns, sizing and care.",
    /** Shown while the admin has written nothing. */
    empty: "We haven’t written our FAQ yet.",
    askUs: "Ask us on the Contact page",
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
        "Thank you for your review, and it helps me improve products.",
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
    /** Under every "Add to cart" button — the shop card's and the product page's. */
    add: {
      adding: "Adding…",
      added: "Added to your cart.",
      view: "View cart",
      /** `{count}` is how many of it are now in the cart, which is all there are. */
      limited: {
        one: "Only {count} in stock — it is in your cart.",
        other: "Only {count} in stock — all of them are in your cart.",
      },
      outOfStock: "Sold out — nothing was added.",
      unavailable: "This item is no longer for sale.",
      failed: "This could not be added to your cart. Please try again.",
      /** The button's own label when there is nothing to add. */
      soldOut: "Sold out",
      /** The product page's counter, beside the button. */
      quantity: "Quantity",
      decrease: "One fewer",
      increase: "One more",
    },
    /** The panel that opens from the header's cart (Figma 178:3431). */
    menu: {
      subtotal: "Subtotal:",
      view: "View cart",
      checkout: "Checkout",
    },
    line: {
      quantity: "Quantity",
      decrease: "One fewer {name}",
      increase: "One more {name}",
      remove: "Remove",
      removeLabel: "Remove {name} from your cart",
      withdrawn: "No longer available. Remove it to check out.",
      outOfStock: "Sold out. Remove it to check out.",
      limitedStock: {
        one: "Only {count} left. Lower the quantity to check out.",
        other: "Only {count} left. Lower the quantity to check out.",
      },
    },
    columns: {
      product: "Product",
      price: "Price",
      total: "Total",
    },
    checkout: "Proceed to Checkout",
    /** The cart page's totals column (Figma 178:4520). */
    totals: "Cart totals",
    coupons: "Add coupons",
    couponsAtCheckout: "Enter your coupon code at checkout.",
    freeShipping: "Free shipping",
    free: "Free",
    shipping: "Shipping",
    shippingLater: "Calculated at checkout",
    estimatedTotal: "Estimated total",
    /** A line's option, written "Color: Blue". */
    optionLabel: "{option}: {value}",
  },
  /** The checkout (Figma 178:7839) and the page an order lands on after it. */
  checkout: {
    title: "Checkout",
    contact: "Contact information",
    email: "Email address",
    shippingAddress: "Shipping address",
    billingAddress: "Billing address",
    country: "Country/Region",
    firstName: "First name",
    lastName: "Last name",
    address: "Address",
    addLine2: "+ Add apartment, suite, etc.",
    line2: "Apartment, suite, etc. (optional)",
    city: "City",
    province: "Province",
    state: "State",
    region: "State / Region (optional)",
    selectProvince: "Select a province",
    selectState: "Select a state",
    postalCode: "Postal code",
    phone: "Phone (optional)",
    sameBilling: "Use same address for billing",
    shippingOptions: "Shipping options",
    shippingPending: "Enter a shipping address to view shipping options.",
    standard: "Standard delivery",
    standardTime: "5–7 business days",
    paymentOptions: "Payment options",
    cod: "Cash on delivery",
    codBody: "Pay with cash upon delivery.",
    addNote: "Add a note to your order",
    note: "Notes about your order, e.g. special notes for delivery",
    terms: "By proceeding with your purchase you agree to our Terms and Conditions and Privacy Policy",
    placeOrder: "Place Order",
    placing: "Placing order…",
    summary: "Order summary",
    subtotal: "Subtotal",
    delivery: "Delivery",
    deliveryPending: "Enter address to calculate",
    free: "Free",
    total: "Total",
    quantity: "Quantity: {count}",
    unavailableNote: "Some items in your cart can no longer be bought and are not part of this order.",
    empty: "Your cart is empty, so there is nothing to check out.",
    errors: {
      required: "This field is required.",
      email: "Enter a valid email address.",
      tooLong: "This is too long.",
      country: "Choose a country we ship to.",
      region: "Choose one from the list.",
      payment: "Choose a payment method.",
      intro: "Some details need another look.",
      cartEmpty: "Your cart is empty — there is nothing to order.",
      stockChanged: "Some items sold out while you were checking out. Review your cart and try again.",
      failed: "Your order could not be placed. Please try again.",
      reviewCart: "Review your cart",
      couponRefused: "Your coupon can no longer be used, so it has been removed. Check the new total and place your order again.",
    },
    /** The order summary's coupon box. `{code}` is the coupon's code. */
    coupon: {
      label: "Coupon code",
      apply: "Apply",
      applying: "Applying…",
      remove: "Remove",
      applied: "Coupon {code} applied",
      discount: "Discount ({code})",
      required: "Enter a coupon code.",
      unknown: "This coupon code is not valid.",
      expired: "This coupon has expired.",
      notApplicable: "This coupon doesn’t apply to the items in your cart.",
      empty: "Your cart is empty — there is nothing to discount.",
      failed: "The coupon could not be checked. Please try again.",
    },
    received: {
      title: "Order received",
      thanks: "Thank you. Your order has been received.",
      number: "Order number",
      date: "Date",
      email: "Email",
      total: "Total",
      payment: "Payment method",
      details: "Order details",
      product: "Product",
      subtotal: "Subtotal",
      discount: "Discount",
      shipping: "Shipping",
      shippingAddress: "Shipping address",
      billingAddress: "Billing address",
      note: "Note",
      continue: "Continue shopping",
    },
  },
  /** My account (Figma 178:2691): the Login and Register forms, and the signed-in view. */
  account: {
    title: "My account",
    login: "Login",
    register: "Register",
    email: "Email address",
    password: "Password",
    confirmPassword: "Confirm Password",
    /** Read aloud for the red asterisk beside a label. */
    required: "required",
    showPassword: "Show password",
    hidePassword: "Hide password",
    remember: "Remember me",
    logIn: "Log in",
    loggingIn: "Logging in…",
    registerButton: "Register",
    registering: "Registering…",
    logOut: "Log out",
    dashboard: "Dashboard",
    orders: "Orders",
    addresses: "Addresses",
    /** The sidebar's accessible name. */
    menu: "Account",
    /** `{logOut}` is the "Log out" link, and `{email}` is drawn in bold. */
    hello: "Hello {email} (not {email}? {logOut})",
    /** `{orders}` and `{addresses}` are the two below, as links to their tabs. */
    intro: "From your account dashboard you can view your {orders} and manage your {addresses}.",
    introOrders: "recent orders",
    introAddresses: "shipping and billing addresses",
    /** My account → Addresses (Figma 178:6792) and its edit form. */
    addressBook: {
      intro: "The following addresses will be used on the checkout page by default.",
      billing: "Billing address",
      shipping: "Shipping address",
      editBilling: "Edit Billing address",
      editShipping: "Edit Shipping address",
      addBilling: "Add Billing address",
      addShipping: "Add Shipping address",
      empty: "You have not set up this type of address yet.",
      save: "Save address",
      saving: "Saving…",
    },
    ordersTable: {
      order: "Order",
      date: "Date",
      status: "Status",
      total: "Total",
      actions: "Actions",
      view: "View",
      viewOrder: "View order {number}",
      totalFor: {
        one: "{amount} for {count} item",
        other: "{amount} for {count} items",
      },
      empty: "No order has been made yet.",
      browse: "Browse products",
    },
    /** plan.md's order states, as a shopper reads them. */
    status: {
      pending: "Pending payment",
      paid: "Paid",
      processing: "Processing",
      shipped: "Shipped",
      delivered: "Delivered",
      failed: "Failed",
      cancelled: "Cancelled",
      refunded: "Refunded",
    },
    errors: {
      email: "Enter a valid email address.",
      password: "Enter your password.",
      passwordShort: "Use at least {min} characters.",
      tooLong: "This is too long.",
      mismatch: "The passwords do not match.",
      invalid: "The email address or password is incorrect.",
      taken: "An account is already registered with this email address. Log in instead.",
      failed: "Something went wrong. Please try again.",
    },
  },
};
