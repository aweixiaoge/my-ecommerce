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

  contact: {
    title: "Nicht sicher, welches Paar zu dir passt?",
    body: "Erzähl uns, wie du hörst, und wir zeigen dir das richtige Modell — oder fang mit den Fragen an, die alle stellen.",
    contact: "Kontakt aufnehmen",
    faq: "FAQ lesen",
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
    cartNote: "Der Warenkorb kommt in Phase 2.",
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
        "Danke — deine Bewertung ist bei uns. Sie erscheint hier, sobald sie freigegeben wurde.",
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
  },
} satisfies Messages;
