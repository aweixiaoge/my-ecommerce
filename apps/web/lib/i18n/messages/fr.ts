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
    cartCount: {
      one: "Panier, {count} article",
      other: "Panier, {count} articles",
    },
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

  /** The Journal page (Figma 178:2586): every post, newest first. */
  journalPage: {
    title: "Journal",
    description: "Guides, comparatifs et notes de ceux qui testent nos écouteurs et casques.",
    empty: "Aucun article pour l’instant — revenez bientôt.",
  },

  /** A post's own page. */
  journalPost: {
    back: "Retour au journal",
  },

  gallery: {
    previous: "Image précédente",
    next: "Image suivante",
    show: "Afficher l’image {n} sur {total}",
  },

  contact: {
    title: "Vous hésitez entre deux modèles ?",
    body: "Dites-nous comment vous écoutez et nous vous orienterons vers le bon modèle — ou commencez par les questions que tout le monde se pose.",
    contact: "Nous contacter",
    faq: "Lire la FAQ",
  },

  /** The Contact page (Figma 178:7601). */
  contactPage: {
    title: "Contact",
    description: "Une question sur une commande ou un produit ? Écrivez-nous, nous vous répondrons.",
    intro: "Une question ? Écrivez-nous, nous vous répondrons dès que possible.",
    name: "Nom",
    namePlaceholder: "Votre nom",
    email: "E-mail",
    emailPlaceholder: "Adresse e-mail",
    subject: "Objet",
    subjectPlaceholder: "Objet",
    message: "Votre message",
    messagePlaceholder: "Votre message",
    /** Read aloud for the red asterisk beside a label. */
    required: "obligatoire",
    submit: "Envoyer",
    sending: "Envoi…",
    sent: "Merci — votre message est bien parti. Nous vous répondrons par e-mail.",
    sendAnother: "Envoyer un autre message",
    getInTouch: "Nous contacter",
    /** The labels before each way of reaching the shop; the values are not copy. */
    tel: "tél. :",
    emailLabel: "e-mail :",
    whatsapp: "WhatsApp :",
    address: "adresse :",
    /** The social links' accessible group name. */
    social: "Suivez-nous",
    errors: {
      required: "Veuillez remplir ce champ.",
      email: "Saisissez une adresse e-mail valide.",
      tooLong: "C’est trop long.",
      failed: "Une erreur s’est produite. Veuillez réessayer.",
    },
  },

  /** The FAQ page; its body is the admin's Contact → FAQ description. */
  /** The About page: the copy and images written under Contact → About. */
  aboutPage: {
    title: "À propos",
    description: "Qui nous sommes, et pourquoi nous testons chaque produit avant de le vendre.",
    /** Shown while the admin has written nothing. */
    empty: "Notre histoire n’est pas encore rédigée.",
    contact: "Dites-nous bonjour sur la page Contact",
  },

  faqPage: {
    title: "FAQ",
    description: "Les réponses aux questions qu’on nous pose le plus — livraison, retours, taille et entretien.",
    /** Shown while the admin has written nothing. */
    empty: "Notre FAQ n’est pas encore rédigée.",
    askUs: "Posez-nous la question sur la page Contact",
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
        "Merci pour votre avis : il m’aide à améliorer les produits.",
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
    add: {
      adding: "Ajout en cours…",
      added: "Ajouté à votre panier.",
      view: "Voir le panier",
      limited: {
        one: "Plus que {count} en stock — il est dans votre panier.",
        other: "Plus que {count} en stock — ils sont tous dans votre panier.",
      },
      outOfStock: "Épuisé — rien n’a été ajouté.",
      unavailable: "Cet article n’est plus en vente.",
      failed: "Impossible d’ajouter cet article à votre panier. Veuillez réessayer.",
      soldOut: "Épuisé",
      quantity: "Quantité",
      decrease: "Un de moins",
      increase: "Un de plus",
    },
    menu: {
      subtotal: "Sous-total :",
      view: "Voir le panier",
      checkout: "Commander",
    },
    line: {
      quantity: "Quantité",
      decrease: "Un {name} de moins",
      increase: "Un {name} de plus",
      remove: "Retirer",
      removeLabel: "Retirer {name} de votre panier",
      withdrawn: "N’est plus disponible. Retirez-le pour passer commande.",
      outOfStock: "Épuisé. Retirez-le pour passer commande.",
      limitedStock: {
        one: "Plus que {count} disponible. Réduisez la quantité pour passer commande.",
        other: "Plus que {count} disponibles. Réduisez la quantité pour passer commande.",
      },
    },
    columns: {
      product: "Produit",
      price: "Prix",
      total: "Total",
    },
    checkout: "Passer commande",
    totals: "Total du panier",
    coupons: "Ajouter un code promo",
    couponsAtCheckout: "Saisissez votre code promo lors du paiement.",
    freeShipping: "Livraison gratuite",
    free: "Gratuite",
    shipping: "Livraison",
    shippingLater: "Calculée lors du paiement",
    estimatedTotal: "Total estimé",
    optionLabel: "{option} : {value}",
  },
  checkout: {
    title: "Paiement",
    contact: "Coordonnées",
    email: "Adresse e-mail",
    shippingAddress: "Adresse de livraison",
    billingAddress: "Adresse de facturation",
    country: "Pays/Région",
    firstName: "Prénom",
    lastName: "Nom",
    address: "Adresse",
    addLine2: "+ Ajouter un appartement, une suite, etc.",
    line2: "Appartement, suite, etc. (facultatif)",
    city: "Ville",
    province: "Province",
    state: "État",
    region: "État / Région (facultatif)",
    selectProvince: "Choisir une province",
    selectState: "Choisir un État",
    postalCode: "Code postal",
    phone: "Téléphone (facultatif)",
    sameBilling: "Utiliser la même adresse pour la facturation",
    shippingOptions: "Options de livraison",
    shippingPending: "Saisissez une adresse de livraison pour voir les options de livraison.",
    standard: "Livraison standard",
    standardTime: "5 à 7 jours ouvrés",
    paymentOptions: "Options de paiement",
    cod: "Paiement à la livraison",
    codBody: "Payez en espèces à la livraison.",
    addNote: "Ajouter une note à votre commande",
    note: "Notes sur votre commande, p. ex. consignes de livraison",
    terms: "En validant votre achat, vous acceptez nos Conditions générales et notre Politique de confidentialité",
    placeOrder: "Passer la commande",
    placing: "Commande en cours…",
    summary: "Récapitulatif de la commande",
    subtotal: "Sous-total",
    delivery: "Livraison",
    deliveryPending: "Saisissez une adresse pour calculer",
    free: "Gratuite",
    total: "Total",
    quantity: "Quantité : {count}",
    unavailableNote: "Certains articles de votre panier ne sont plus disponibles et ne font pas partie de cette commande.",
    empty: "Votre panier est vide, il n’y a rien à commander.",
    errors: {
      required: "Ce champ est obligatoire.",
      email: "Saisissez une adresse e-mail valide.",
      tooLong: "C’est trop long.",
      country: "Choisissez un pays où nous livrons.",
      region: "Choisissez une valeur dans la liste.",
      payment: "Choisissez un mode de paiement.",
      intro: "Certaines informations sont à revoir.",
      cartEmpty: "Votre panier est vide, il n’y a rien à commander.",
      stockChanged: "Certains articles ont été épuisés pendant votre commande. Vérifiez votre panier et réessayez.",
      failed: "Votre commande n’a pas pu être passée. Veuillez réessayer.",
      reviewCart: "Vérifier le panier",
      couponRefused: "Votre code promo ne peut plus être utilisé et a été retiré. Vérifiez le nouveau total et passez à nouveau votre commande.",
    },
    /** The order summary's coupon box. `{code}` is the coupon's code. */
    coupon: {
      label: "Code promo",
      apply: "Appliquer",
      applying: "Application…",
      remove: "Retirer",
      applied: "Code promo {code} appliqué",
      discount: "Remise ({code})",
      required: "Saisissez un code promo.",
      unknown: "Ce code promo n’est pas valide.",
      expired: "Ce code promo a expiré.",
      notApplicable: "Ce code promo ne s’applique pas aux articles de votre panier.",
      empty: "Votre panier est vide : il n’y a rien à remiser.",
      failed: "Le code promo n’a pas pu être vérifié. Veuillez réessayer.",
    },
    received: {
      title: "Commande reçue",
      thanks: "Merci. Votre commande a bien été reçue.",
      number: "Numéro de commande",
      date: "Date",
      email: "E-mail",
      total: "Total",
      payment: "Mode de paiement",
      details: "Détails de la commande",
      product: "Produit",
      subtotal: "Sous-total",
      discount: "Remise",
      shipping: "Livraison",
      shippingAddress: "Adresse de livraison",
      billingAddress: "Adresse de facturation",
      note: "Note",
      continue: "Continuer mes achats",
    },
  },
  account: {
    title: "Mon compte",
    login: "Connexion",
    register: "Inscription",
    email: "Adresse e-mail",
    password: "Mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    required: "obligatoire",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    remember: "Se souvenir de moi",
    logIn: "Se connecter",
    loggingIn: "Connexion…",
    registerButton: "S’inscrire",
    registering: "Inscription…",
    logOut: "Se déconnecter",
    dashboard: "Tableau de bord",
    orders: "Commandes",
    addresses: "Adresses",
    menu: "Compte",
    hello: "Bonjour {email} (vous n’êtes pas {email} ? {logOut})",
    intro: "Depuis le tableau de bord de votre compte, vous pouvez consulter vos {orders} et gérer vos {addresses}.",
    introOrders: "commandes récentes",
    introAddresses: "adresses de livraison et de facturation",
    addressBook: {
      intro: "Les adresses suivantes seront utilisées par défaut lors du paiement.",
      billing: "Adresse de facturation",
      shipping: "Adresse de livraison",
      editBilling: "Modifier l’adresse de facturation",
      editShipping: "Modifier l’adresse de livraison",
      addBilling: "Ajouter une adresse de facturation",
      addShipping: "Ajouter une adresse de livraison",
      empty: "Vous n’avez pas encore enregistré ce type d’adresse.",
      save: "Enregistrer l’adresse",
      saving: "Enregistrement…",
    },
    ordersTable: {
      order: "Commande",
      date: "Date",
      status: "État",
      total: "Total",
      actions: "Actions",
      view: "Voir",
      viewOrder: "Voir la commande {number}",
      totalFor: {
        one: "{amount} pour {count} article",
        other: "{amount} pour {count} articles",
      },
      empty: "Aucune commande n’a encore été passée.",
      browse: "Voir les produits",
    },
    status: {
      pending: "Paiement en attente",
      paid: "Payée",
      processing: "En cours",
      shipped: "Expédiée",
      delivered: "Livrée",
      failed: "Échouée",
      cancelled: "Annulée",
      refunded: "Remboursée",
    },
    errors: {
      email: "Saisissez une adresse e-mail valide.",
      password: "Saisissez votre mot de passe.",
      passwordShort: "Utilisez au moins {min} caractères.",
      tooLong: "C’est trop long.",
      mismatch: "Les mots de passe ne correspondent pas.",
      invalid: "L’adresse e-mail ou le mot de passe est incorrect.",
      taken: "Un compte existe déjà avec cette adresse e-mail. Connectez-vous plutôt.",
      failed: "Une erreur s’est produite. Veuillez réessayer.",
    },
  },
} satisfies Messages;
