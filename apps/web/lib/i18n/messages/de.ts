import type { Messages } from "../messages";

/**
 * German.
 *
 * Written rather than translated word for word, in the shop's own voice: short
 * sentences, no marketing register, and "du" nowhere it would be out of place
 * (the site addresses the reader directly in English — "Tell us how you
 * listen" — so the German does too, with "Sie" where a shop would use it).
 *
 * Three things are deliberately identical to the English:
 *
 * - `header.brand` and `footer.copyright` — a brand name and a legal line.
 * - `product.sku` — the abbreviation is the one German shops print.
 * - `product.rangeSeparator` — the dash between two prices.
 *
 * How *much* a product costs is not here at all: amounts are formatted for the
 * language by `Intl` (`lib/format.ts`), so `{amount}` arrives as `50,00 $` and
 * this file never holds a number.
 */
export const de = {
  nav: {
    home: "Startseite",
    shop: "Shop",
    about: "Über uns",
    journal: "Journal",
    contact: "Kontakt",
    faq: "FAQ",
    account: "Mein Konto",
  },

  header: {
    brand: "Smart Mall",
    cart: "Warenkorb",
    cartCount: {
      one: "Warenkorb, {count} Artikel",
      other: "Warenkorb, {count} Artikel",
    },
    openMenu: "Menü öffnen",
    closeMenu: "Menü schließen",
    mobileNav: "Mobil",
    language: "Sprache: {code}",
    currency: "Währung: {code}",
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
      "Von Hand getestete Audiotechnik — Ohrhörer, In-Ears und Kopfhörer, von unserem eigenen Team getestet, bevor sie in deinen Warenkorb kommen.",
  },

  hero: {
    eyebrow: "Von Hand getestete Audiotechnik",
    fallbackTitle: "Klang, der mit deinem Tag mithält.",
    fallbackBody:
      "Kabellose Ohrhörer, In-Ears und Kopfhörer — jedes Stück von unserem eigenen Team getestet, bevor es in deinen Warenkorb kommt.",
    ctaProduct: "Jetzt shoppen",
    ctaFallback: "Alle Produkte",
    story: "Unsere Geschichte",
    imageAlt: "Kabellose Kopfhörer an einer Küstenlinie",
  },

  trustBar: [
    {
      title: "Versandkostenfrei ab {amount}",
      body: "Standardlieferung in 5–7 Werktagen.",
    },
    {
      title: "30 Tage Rückgaberecht",
      body: "Meinung geändert? Schick es zurück und bekomm dein Geld wieder.",
    },
    {
      title: "Von Hand getestete Produkte",
      body: "Jedes Stück wird zuerst von unserem Team benutzt und beurteilt.",
    },
    {
      title: "Echter Support",
      body: "Fragen vor oder nach dem Kauf? Schreib uns einfach.",
    },
  ],

  arrivals: {
    title: "Neu eingetroffen",
    link: "Alle Produkte ansehen →",
  },

  whyBuy: {
    eyebrow: "Warum bei uns kaufen",
    title: "Wir benutzen die Technik, bevor wir sie verkaufen.",
    body: "Nichts kommt in den Katalog, bevor es durch unsere eigenen Ohren gegangen ist — Akkulaufzeit gemessen, Sitz geprüft, Telefonate auf einer belebten Straße geführt. Wenn es nicht überzeugt, führen wir es nicht.",
    cta: "Mehr über uns",
    imageAlt: "Ein Paar Kopfhörer auf einer geriffelten Fläche",
  },

  journal: {
    title: "Aus dem Journal",
    link: "Alle Beiträge →",
  },

  /** The Journal page (Figma 178:2586): every post, newest first. */
  journalPage: {
    title: "Journal",
    description: "Ratgeber, Vergleiche und Notizen von den Leuten, die unsere Kopfhörer testen.",
    empty: "Noch keine Artikel — schau bald wieder vorbei.",
  },

  /** A post's own page. */
  journalPost: {
    back: "Zurück zum Journal",
  },

  gallery: {
    show: "Bild {n} von {total} anzeigen",
  },

  contact: {
    title: "Nicht sicher, welches Paar zu dir passt?",
    body: "Erzähl uns, wie du hörst, und wir zeigen dir das richtige Modell — oder fang mit den Fragen an, die alle stellen.",
    contact: "Kontakt aufnehmen",
    faq: "FAQ lesen",
  },

  /** The Contact page (Figma 178:7601). */
  contactPage: {
    title: "Kontakt",
    description: "Fragen zu einer Bestellung oder einem Produkt? Schreib uns, wir melden uns bei dir.",
    intro: "Eine Frage? Schreib uns, wir antworten so schnell wie möglich.",
    name: "Name",
    namePlaceholder: "Dein Name",
    email: "E-Mail",
    emailPlaceholder: "E-Mail-Adresse",
    subject: "Betreff",
    subjectPlaceholder: "Betreff",
    message: "Deine Nachricht",
    messagePlaceholder: "Deine Nachricht",
    /** Read aloud for the red asterisk beside a label. */
    required: "Pflichtfeld",
    submit: "Absenden",
    sending: "Wird gesendet…",
    sent: "Danke — deine Nachricht ist unterwegs. Wir antworten per E-Mail.",
    sendAnother: "Weitere Nachricht senden",
    getInTouch: "Kontakt aufnehmen",
    /** The labels before each way of reaching the shop; the values are not copy. */
    tel: "Tel.:",
    emailLabel: "E-Mail:",
    whatsapp: "WhatsApp:",
    address: "Adresse:",
    /** The social links' accessible group name. */
    social: "Folge uns",
    errors: {
      required: "Bitte fülle dieses Feld aus.",
      email: "Gib eine gültige E-Mail-Adresse ein.",
      tooLong: "Das ist zu lang.",
      failed: "Etwas ist schiefgelaufen. Bitte versuche es noch einmal.",
    },
  },

  /** The FAQ page; its body is the admin's Contact → FAQ description. */
  /** The About page: the copy and images written under Contact → About. */
  aboutPage: {
    title: "Über uns",
    description: "Wer wir sind und warum wir jedes Gerät testen, bevor wir es verkaufen.",
    /** Shown while the admin has written nothing. */
    empty: "Unsere Geschichte ist noch nicht geschrieben.",
    contact: "Sag Hallo auf der Kontaktseite",
  },

  faqPage: {
    title: "FAQ",
    description: "Antworten auf die häufigsten Fragen — Versand, Rückgabe, Passform und Pflege.",
    /** Shown while the admin has written nothing. */
    empty: "Unsere FAQ sind noch nicht geschrieben.",
    askUs: "Frag uns auf der Kontaktseite",
  },

  shop: {
    title: "Shop",
    description:
      "Jeder Ohrhörer, jedes In-Ear und jeder Kopfhörer, den wir führen — von unserem eigenen Team getestet, bevor er in deinen Warenkorb kommt.",
    bannerTitle: "Von Hand getestete Technik",
    bannerBody:
      "Jedes Paar auf dieser Seite wurde zuerst hier von jemandem getragen. Akkulaufzeit über eine Woche Pendelverkehr gemessen, Sitz beim Laufen geprüft, Telefonate auf einer belebten Straße geführt. Was nicht überzeugt hat, kam nie in den Katalog — und was wir beim Testen gelernt haben, steht im Journal.",
    bannerCta: "Mehr erfahren",
    bannerImageAlt: "Ein Paar Kopfhörer auf einer geriffelten Fläche",
  },

  listing: {
    results: "{from}–{to} von {total} Ergebnissen",
    noResults: "Keine Ergebnisse",
    sortLabel: "Produkte sortieren",
    sortApply: "Sortierung anwenden",
    sort: {
      default: "Standardsortierung",
      priceAsc: "Preis, aufsteigend",
      priceDesc: "Preis, absteigend",
      nameAsc: "Name, A bis Z",
    },
    pagination: "Seitennavigation",
    next: "Weiter",
    emptyCategory: "In dieser Kategorie ist noch nichts einsortiert.",
    addToCart: "In den Warenkorb",
  },

  product: {
    breadcrumb: "Brotkrumen-Navigation",
    home: "Startseite",
    description: "Beschreibung",
    reviews: "Bewertungen ({count})",
    related: "Ähnliche Produkte",
    imageAlt: "Bild von {name} anzeigen",
    reviewCount: {
      one: "{count} Kundenbewertung",
      other: "{count} Kundenbewertungen",
    },
    unavailable: "In dieser Kombination nicht verfügbar",
    addToCart: "In den Warenkorb",
    sku: "SKU:",
    category: "Kategorie:",
    rangeSeparator: " – ",
  },

  reviews: {
    empty: "Noch keine Bewertungen.",
    listTitle: {
      one: "{count} Bewertung für {product}",
      other: "{count} Bewertungen für {product}",
    },
    singleRating: "Mit {rating} von 5 bewertet",
    summary: "Mit {average} von 5 bewertet, aus {count} Bewertungen",
    form: {
      title: "Bewertung schreiben",
      note: "Deine E-Mail-Adresse wird nicht veröffentlicht. Pflichtfelder sind mit einem Sternchen markiert",
      rating: "Deine Bewertung",
      star: { one: "{count} Stern", other: "{count} Sterne" },
      name: "Name",
      email: "E-Mail",
      body: "Deine Bewertung",
      submit: "Absenden",
      sending: "Wird gesendet…",
      thanks:
        "Danke für deine Bewertung – sie hilft mir, die Produkte zu verbessern.",
    },
    errors: {
      productUnknown:
        "Dieses Produkt konnte nicht zugeordnet werden. Lade die Seite neu und versuch es noch einmal.",
      saveFailed:
        "Deine Bewertung konnte nicht gespeichert werden. Versuch es noch einmal und prüf, ob der Server läuft, wenn es weiter fehlschlägt.",
      productUnavailable:
        "Dieses Produkt ist nicht mehr verfügbar, es gibt also nichts zu bewerten.",
      nameRequired: "Gib deinen Namen ein.",
      nameTooLong: "Der Name ist zu lang.",
      emailInvalid: "Gib eine gültige E-Mail-Adresse ein.",
      emailTooLong: "Die E-Mail-Adresse ist zu lang.",
      ratingRange: "Wähle zwischen 1 und 5 Sternen.",
      bodyRequired: "Schreib deine Bewertung.",
      bodyTooLong: "Deine Bewertung ist zu lang.",
    },
  },

  cart: {
    title: "Warenkorb",
    heading: "Dein Warenkorb",
    empty: "Dein Warenkorb ist leer.",
    continue: "Weiter einkaufen",
    add: {
      adding: "Wird hinzugefügt…",
      added: "Zum Warenkorb hinzugefügt.",
      view: "Zum Warenkorb",
      limited: {
        one: "Nur noch {count} auf Lager — er liegt in deinem Warenkorb.",
        other: "Nur noch {count} auf Lager — alle liegen in deinem Warenkorb.",
      },
      outOfStock: "Ausverkauft — es wurde nichts hinzugefügt.",
      unavailable: "Dieser Artikel ist nicht mehr erhältlich.",
      failed: "Das konnte nicht in den Warenkorb gelegt werden. Versuch es noch einmal.",
      soldOut: "Ausverkauft",
      quantity: "Menge",
      decrease: "Eins weniger",
      increase: "Eins mehr",
    },
    menu: {
      subtotal: "Zwischensumme:",
      view: "Warenkorb ansehen",
      checkout: "Zur Kasse",
    },
    line: {
      quantity: "Menge",
      decrease: "Ein {name} weniger",
      increase: "Ein {name} mehr",
      remove: "Entfernen",
      removeLabel: "{name} aus dem Warenkorb entfernen",
      withdrawn: "Nicht mehr erhältlich. Entferne den Artikel, um zur Kasse zu gehen.",
      outOfStock: "Ausverkauft. Entferne den Artikel, um zur Kasse zu gehen.",
      limitedStock: {
        one: "Nur noch {count} verfügbar. Verringere die Menge, um zur Kasse zu gehen.",
        other: "Nur noch {count} verfügbar. Verringere die Menge, um zur Kasse zu gehen.",
      },
    },
    columns: {
      product: "Produkt",
      price: "Preis",
      total: "Summe",
    },
    checkout: "Zur Kasse",
    totals: "Warenkorbsumme",
    coupons: "Gutschein hinzufügen",
    couponsAtCheckout: "Gib deinen Gutscheincode an der Kasse ein.",
    freeShipping: "Kostenloser Versand",
    free: "Kostenlos",
    shipping: "Versand",
    shippingLater: "Wird an der Kasse berechnet",
    estimatedTotal: "Geschätzte Summe",
    optionLabel: "{option}: {value}",
  },
  checkout: {
    title: "Kasse",
    contact: "Kontaktdaten",
    email: "E-Mail-Adresse",
    shippingAddress: "Lieferadresse",
    billingAddress: "Rechnungsadresse",
    country: "Land/Region",
    firstName: "Vorname",
    lastName: "Nachname",
    address: "Adresse",
    addLine2: "+ Wohnung, Stockwerk usw. hinzufügen",
    line2: "Wohnung, Stockwerk usw. (optional)",
    city: "Stadt",
    province: "Provinz",
    state: "Bundesstaat",
    region: "Bundesland / Region (optional)",
    selectProvince: "Provinz auswählen",
    selectState: "Bundesstaat auswählen",
    postalCode: "Postleitzahl",
    phone: "Telefon (optional)",
    sameBilling: "Gleiche Adresse für die Rechnung verwenden",
    shippingOptions: "Versandoptionen",
    shippingPending: "Gib eine Lieferadresse ein, um die Versandoptionen zu sehen.",
    standard: "Standardversand",
    standardTime: "5–7 Werktage",
    paymentOptions: "Zahlungsoptionen",
    cod: "Zahlung bei Lieferung",
    codBody: "Bezahle bar bei Lieferung.",
    addNote: "Eine Anmerkung zur Bestellung hinzufügen",
    note: "Anmerkungen zu deiner Bestellung, z. B. Hinweise zur Lieferung",
    terms: "Mit deinem Kauf stimmst du unseren AGB und unserer Datenschutzerklärung zu",
    placeOrder: "Bestellung aufgeben",
    placing: "Bestellung wird aufgegeben…",
    summary: "Bestellübersicht",
    subtotal: "Zwischensumme",
    delivery: "Lieferung",
    deliveryPending: "Adresse eingeben, um zu berechnen",
    free: "Kostenlos",
    total: "Gesamt",
    quantity: "Menge: {count}",
    unavailableNote: "Einige Artikel in deinem Warenkorb sind nicht mehr erhältlich und gehören nicht zu dieser Bestellung.",
    empty: "Dein Warenkorb ist leer – es gibt nichts zu bestellen.",
    errors: {
      required: "Dieses Feld ist erforderlich.",
      email: "Gib eine gültige E-Mail-Adresse ein.",
      tooLong: "Das ist zu lang.",
      country: "Wähle ein Land, in das wir liefern.",
      region: "Wähle einen Eintrag aus der Liste.",
      payment: "Wähle eine Zahlungsart.",
      intro: "Einige Angaben müssen noch einmal geprüft werden.",
      cartEmpty: "Dein Warenkorb ist leer – es gibt nichts zu bestellen.",
      stockChanged: "Einige Artikel waren während des Bestellens ausverkauft. Prüfe deinen Warenkorb und versuch es noch einmal.",
      failed: "Deine Bestellung konnte nicht aufgegeben werden. Versuch es noch einmal.",
      reviewCart: "Warenkorb prüfen",
      couponRefused: "Dein Gutschein kann nicht mehr verwendet werden und wurde entfernt. Prüf die neue Summe und gib deine Bestellung erneut auf.",
    },
    /** The order summary's coupon box. `{code}` is the coupon's code. */
    coupon: {
      label: "Gutscheincode",
      apply: "Einlösen",
      applying: "Wird eingelöst…",
      remove: "Entfernen",
      applied: "Gutschein {code} eingelöst",
      discount: "Rabatt ({code})",
      required: "Gib einen Gutscheincode ein.",
      unknown: "Dieser Gutscheincode ist ungültig.",
      expired: "Dieser Gutschein ist abgelaufen.",
      notApplicable: "Dieser Gutschein gilt nicht für die Artikel in deinem Warenkorb.",
      empty: "Dein Warenkorb ist leer – es gibt nichts zu rabattieren.",
      failed: "Der Gutschein konnte nicht geprüft werden. Versuch es noch einmal.",
    },
    received: {
      title: "Bestellung eingegangen",
      thanks: "Danke. Deine Bestellung ist eingegangen.",
      number: "Bestellnummer",
      date: "Datum",
      email: "E-Mail",
      total: "Gesamt",
      payment: "Zahlungsart",
      details: "Bestelldetails",
      product: "Produkt",
      subtotal: "Zwischensumme",
      discount: "Rabatt",
      shipping: "Versand",
      shippingAddress: "Lieferadresse",
      billingAddress: "Rechnungsadresse",
      note: "Anmerkung",
      continue: "Weiter einkaufen",
    },
  },
  account: {
    title: "Mein Konto",
    login: "Anmelden",
    register: "Registrieren",
    email: "E-Mail-Adresse",
    password: "Passwort",
    confirmPassword: "Passwort bestätigen",
    required: "Pflichtfeld",
    showPassword: "Passwort anzeigen",
    hidePassword: "Passwort verbergen",
    remember: "Angemeldet bleiben",
    logIn: "Anmelden",
    loggingIn: "Wird angemeldet…",
    registerButton: "Registrieren",
    registering: "Wird registriert…",
    logOut: "Abmelden",
    dashboard: "Übersicht",
    orders: "Bestellungen",
    addresses: "Adressen",
    menu: "Konto",
    hello: "Hallo {email} (nicht {email}? {logOut})",
    intro: "In deiner Kontoübersicht siehst du deine {orders} und verwaltest deine {addresses}.",
    introOrders: "letzten Bestellungen",
    introAddresses: "Liefer- und Rechnungsadressen",
    addressBook: {
      intro: "Diese Adressen werden an der Kasse automatisch verwendet.",
      billing: "Rechnungsadresse",
      shipping: "Lieferadresse",
      editBilling: "Rechnungsadresse bearbeiten",
      editShipping: "Lieferadresse bearbeiten",
      addBilling: "Rechnungsadresse hinzufügen",
      addShipping: "Lieferadresse hinzufügen",
      empty: "Du hast diese Adresse noch nicht angelegt.",
      save: "Adresse speichern",
      saving: "Wird gespeichert…",
    },
    ordersTable: {
      order: "Bestellung",
      date: "Datum",
      status: "Status",
      total: "Summe",
      actions: "Aktionen",
      view: "Ansehen",
      viewOrder: "Bestellung {number} ansehen",
      totalFor: {
        one: "{amount} für {count} Artikel",
        other: "{amount} für {count} Artikel",
      },
      empty: "Du hast noch keine Bestellung aufgegeben.",
      browse: "Produkte ansehen",
    },
    status: {
      pending: "Zahlung ausstehend",
      paid: "Bezahlt",
      processing: "In Bearbeitung",
      shipped: "Versandt",
      delivered: "Zugestellt",
      failed: "Fehlgeschlagen",
      cancelled: "Storniert",
      refunded: "Erstattet",
    },
    errors: {
      email: "Gib eine gültige E-Mail-Adresse ein.",
      password: "Gib dein Passwort ein.",
      passwordShort: "Verwende mindestens {min} Zeichen.",
      tooLong: "Das ist zu lang.",
      mismatch: "Die Passwörter stimmen nicht überein.",
      invalid: "E-Mail-Adresse oder Passwort ist falsch.",
      taken: "Für diese E-Mail-Adresse gibt es bereits ein Konto. Melde dich stattdessen an.",
      failed: "Etwas ist schiefgelaufen. Bitte versuche es noch einmal.",
    },
  },
} satisfies Messages;
