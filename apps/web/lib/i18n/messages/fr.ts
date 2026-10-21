import type { Messages } from "../messages";

/**
 * French.
 *
 * The register is "vous" rather than "tu": French shops address a customer that
 * way even when the English copy beside them is informal, and a shop that says
 * "tu" to a stranger reads as a different kind of shop. The German catalog
 * makes the opposite choice for the opposite reason — register is a property of
 * each language, not a property of the brand.
 *
 * Spacing follows the language: a space before `:` and `?`, as French
 * typography asks, and a narrow space inside the guillemets where any are used.
 * Amounts are not here at all — `Intl` formats `{amount}` as `50,00 $`.
 */
export const fr = {
  nav: {
    home: "Accueil",
    shop: "Boutique",
    about: "À propos",
    journal: "Journal",
    contact: "Contact",
    faq: "FAQ",
    account: "Mon compte",
  },

  header: {
    brand: "Smart Mall",
    cart: "Panier",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    mobileNav: "Mobile",
    language: "Langue : {code}",
    currency: "Devise : {code}",
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
      "Du matériel audio testé à la main — intras, écouteurs et casques, testés par notre équipe avant d’arriver dans votre panier.",
  },

  hero: {
    eyebrow: "Audio testé à la main",
    fallbackTitle: "Un son qui tient le rythme de vos journées.",
    fallbackBody:
      "Écouteurs sans fil, intras et casques — chacun testé par notre propre équipe avant d’arriver dans votre panier.",
    ctaProduct: "Voir ce produit",
    ctaFallback: "Tous les produits",
    story: "Notre histoire",
    imageAlt: "Casque sans fil posé face à un rivage",
  },

  trustBar: [
    {
      title: "Livraison offerte dès {amount}",
      body: "Livraison standard en 5 à 7 jours ouvrés.",
    },
    {
      title: "Retours sous 30 jours",
      body: "Vous avez changé d’avis ? Renvoyez-le et soyez remboursé.",
    },
    {
      title: "Produits testés à la main",
      body: "Chaque article est d’abord utilisé et critiqué par notre équipe.",
    },
    {
      title: "Un vrai support",
      body: "Des questions avant ou après l’achat ? Écrivez-nous.",
    },
  ],

  arrivals: {
    title: "Nouveautés",
    link: "Voir tous les produits →",
  },

  whyBuy: {
    eyebrow: "Pourquoi acheter chez nous",
    title: "Nous utilisons le matériel avant de le vendre.",
    body: "Rien n’entre au catalogue sans être passé par nos propres oreilles — autonomie mesurée, maintien testé, appels passés dans une rue passante. Si ça ne tient pas la route, nous ne le référençons pas.",
    cta: "En savoir plus sur nous",
    imageAlt: "Une paire de casques sur une surface striée",
  },

  journal: {
    title: "Du journal",
    link: "Tous les articles →",
  },

  contact: {
    title: "Vous hésitez entre deux modèles ?",
    body: "Dites-nous comment vous écoutez et nous vous orienterons vers le bon modèle — ou commencez par les questions que tout le monde se pose.",
    contact: "Nous contacter",
    faq: "Lire la FAQ",
  },

  shop: {
    title: "Boutique",
    description:
      "Tous les intras, écouteurs et casques que nous référençons — testés à la main par notre équipe avant d’arriver dans votre panier.",
    bannerTitle: "Du matériel testé à la main",
    bannerBody:
      "Chaque paire présentée sur cette page a d’abord été portée par quelqu’un ici. Autonomie mesurée sur une semaine de trajets, maintien vérifié en course, appels passés dans une rue passante. Celles qui n’ont pas convaincu ne sont jamais entrées au catalogue — et ce que nous avons appris en les testant est dans le journal.",
    bannerCta: "En savoir plus",
    bannerImageAlt: "Une paire de casques sur une surface striée",
  },

  listing: {
    results: "{from}–{to} sur {total} résultats",
    noResults: "Aucun résultat",
    sortLabel: "Trier les produits",
    sortApply: "Appliquer le tri",
    sort: {
      default: "Tri par défaut",
      priceAsc: "Prix croissant",
      priceDesc: "Prix décroissant",
      nameAsc: "Nom, de A à Z",
    },
    pagination: "Pagination",
    next: "Suivant",
    emptyCategory: "Rien n’est encore classé dans cette catégorie.",
    addToCart: "Ajouter au panier",
  },

  product: {
    breadcrumb: "Fil d’Ariane",
    home: "Accueil",
    description: "Description",
    reviews: "Avis ({count})",
    related: "Produits similaires",
    imageAlt: "Afficher l’image de {name}",
    reviewCount: {
      one: "{count} avis client",
      other: "{count} avis clients",
    },
    unavailable: "Indisponible dans cette combinaison",
    addToCart: "Ajouter au panier",
    cartNote: "Le panier arrive en phase 2.",
    sku: "SKU :",
    category: "Catégorie :",
    rangeSeparator: " – ",
  },

  reviews: {
    empty: "Pas encore d’avis.",
    listTitle: {
      one: "{count} avis pour {product}",
      other: "{count} avis pour {product}",
    },
    singleRating: "Noté {rating} sur 5",
    summary: "Noté {average} sur 5 à partir de {count} avis",
    form: {
      title: "Laisser un avis",
      note: "Votre adresse e-mail ne sera pas publiée. Les champs obligatoires sont marqués",
      rating: "Votre note",
      star: { one: "{count} étoile", other: "{count} étoiles" },
      name: "Nom",
      email: "E-mail",
      body: "Votre avis",
      submit: "Envoyer",
      sending: "Envoi…",
      thanks:
        "Merci — votre avis nous est parvenu. Il apparaîtra ici dès qu’il aura été validé.",
    },
    errors: {
      productUnknown:
        "Ce produit n’a pas pu être identifié. Rechargez la page et réessayez.",
      saveFailed:
        "Votre avis n’a pas pu être enregistré. Réessayez, et vérifiez que le serveur tourne si cela échoue encore.",
      productUnavailable:
        "Ce produit n’est plus disponible, il n’y a donc rien à évaluer.",
      nameRequired: "Saisissez votre nom.",
      nameTooLong: "Le nom est trop long.",
      emailInvalid: "Saisissez une adresse e-mail valide.",
      emailTooLong: "L’adresse e-mail est trop longue.",
      ratingRange: "Choisissez entre 1 et 5 étoiles.",
      bodyRequired: "Écrivez votre avis.",
      bodyTooLong: "Votre avis est trop long.",
    },
  },

  cart: {
    title: "Panier",
    heading: "Votre panier",
    empty: "Votre panier est vide.",
    continue: "Continuer mes achats",
  },
} satisfies Messages;
