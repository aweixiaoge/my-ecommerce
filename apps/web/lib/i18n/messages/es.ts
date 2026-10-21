import type { Messages } from "../messages";

/**
 * Spanish, as written in Spain.
 *
 * "Tú" rather than "usted": Spanish shops address customers that way, and the
 * English copy this is written from is personal ("every one of them tested by
 * our own team before it reaches your cart"). The category nouns the shop's own
 * copy uses are here too — "auriculares de botón", "intraurales" and "de
 * diadema" are three different things to a Spanish shopper, and the English
 * sentence names all three.
 */
export const es = {
  nav: {
    home: "Inicio",
    shop: "Tienda",
    about: "Sobre nosotros",
    journal: "Diario",
    contact: "Contacto",
    faq: "Preguntas frecuentes",
    account: "Mi cuenta",
  },

  header: {
    brand: "Smart Mall",
    cart: "Carrito",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    mobileNav: "Móvil",
    language: "Idioma: {code}",
    currency: "Moneda: {code}",
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
      "Equipo de audio probado a mano — auriculares de botón, intraurales y de diadema, probados por nuestro equipo antes de llegar a tu carrito.",
  },

  hero: {
    eyebrow: "Audio probado a mano",
    fallbackTitle: "Un sonido que sigue el ritmo de tu día.",
    fallbackBody:
      "Auriculares inalámbricos, intraurales y de diadema — todos probados por nuestro propio equipo antes de llegar a tu carrito.",
    ctaProduct: "Comprar ahora",
    ctaFallback: "Ver todos los productos",
    story: "Nuestra historia",
    imageAlt: "Auriculares inalámbricos junto a la costa",
  },

  trustBar: [
    {
      title: "Envío gratis a partir de {amount}",
      body: "Entrega estándar en 5–7 días laborables.",
    },
    {
      title: "Devoluciones en 30 días",
      body: "¿Cambiaste de opinión? Devuélvelo y te devolvemos el dinero.",
    },
    {
      title: "Productos probados a mano",
      body: "Nuestro equipo usa y critica cada artículo antes que nadie.",
    },
    {
      title: "Atención de verdad",
      body: "¿Dudas antes o después de comprar? Escríbenos.",
    },
  ],

  arrivals: {
    title: "Novedades",
    link: "Ver todos los productos →",
  },

  whyBuy: {
    eyebrow: "Por qué comprar aquí",
    title: "Usamos el equipo antes de venderlo.",
    body: "Nada entra en el catálogo sin pasar por nuestros propios oídos — autonomía medida, sujeción probada, llamadas hechas en una calle concurrida. Si no aguanta, no lo vendemos.",
    cta: "Más sobre nosotros",
    imageAlt: "Un par de auriculares sobre una superficie estriada",
  },

  journal: {
    title: "Del diario",
    link: "Todos los artículos →",
  },

  contact: {
    title: "¿No sabes qué par es el tuyo?",
    body: "Cuéntanos cómo escuchas y te orientamos hacia el modelo adecuado — o empieza por las preguntas que todos hacen.",
    contact: "Contacta con nosotros",
    faq: "Leer las preguntas frecuentes",
  },

  shop: {
    title: "Tienda",
    description:
      "Cada auricular de botón, intraural y de diadema que vendemos — probado por nuestro equipo antes de llegar a tu carrito.",
    bannerTitle: "Equipo probado a mano",
    bannerBody:
      "Cada par que llega a esta página lo ha llevado antes alguien de aquí. Autonomía medida a lo largo de una semana de trayectos, sujeción comprobada corriendo, llamadas hechas en una calle concurrida. Los que no aguantaron nunca entraron en el catálogo — y lo que aprendimos probándolos está en el diario.",
    bannerCta: "Saber más",
    bannerImageAlt: "Un par de auriculares sobre una superficie estriada",
  },

  listing: {
    results: "Mostrando {from}–{to} de {total} resultados",
    noResults: "Sin resultados",
    sortLabel: "Ordenar productos",
    sortApply: "Aplicar ordenación",
    sort: {
      default: "Orden predeterminado",
      priceAsc: "Precio, de menor a mayor",
      priceDesc: "Precio, de mayor a menor",
      nameAsc: "Nombre, de A a Z",
    },
    pagination: "Paginación",
    next: "Siguiente",
    emptyCategory: "Aún no hay nada en esta categoría.",
    addToCart: "Añadir al carrito",
  },

  product: {
    breadcrumb: "Ruta de navegación",
    home: "Inicio",
    description: "Descripción",
    reviews: "Reseñas ({count})",
    related: "Productos relacionados",
    imageAlt: "Mostrar imagen de {name}",
    reviewCount: {
      one: "{count} reseña de cliente",
      other: "{count} reseñas de clientes",
    },
    unavailable: "No disponible en esta combinación",
    addToCart: "Añadir al carrito",
    cartNote: "El carrito llega en la fase 2.",
    sku: "SKU:",
    category: "Categoría:",
    rangeSeparator: " – ",
  },

  reviews: {
    empty: "Aún no hay reseñas.",
    listTitle: {
      one: "{count} reseña de {product}",
      other: "{count} reseñas de {product}",
    },
    singleRating: "Valorado con {rating} de 5",
    summary: "Valorado con {average} de 5 en {count} reseñas",
    form: {
      title: "Escribir una reseña",
      note: "Tu dirección de correo electrónico no será publicada. Los campos obligatorios están marcados",
      rating: "Tu valoración",
      star: { one: "{count} estrella", other: "{count} estrellas" },
      name: "Nombre",
      email: "Correo electrónico",
      body: "Tu reseña",
      submit: "Enviar",
      sending: "Enviando…",
      thanks:
        "Gracias — tu reseña nos ha llegado. Aparecerá aquí en cuanto la aprobemos.",
    },
    errors: {
      productUnknown:
        "No se ha podido identificar este producto. Recarga la página e inténtalo de nuevo.",
      saveFailed:
        "No se ha podido guardar tu reseña. Inténtalo de nuevo y comprueba que el servidor está funcionando si sigue fallando.",
      productUnavailable:
        "Este producto ya no está disponible, así que no hay nada que valorar.",
      nameRequired: "Escribe tu nombre.",
      nameTooLong: "El nombre es demasiado largo.",
      emailInvalid: "Escribe una dirección de correo válida.",
      emailTooLong: "La dirección de correo es demasiado larga.",
      ratingRange: "Elige entre 1 y 5 estrellas.",
      bodyRequired: "Escribe tu reseña.",
      bodyTooLong: "Tu reseña es demasiado larga.",
    },
  },

  cart: {
    title: "Carrito",
    heading: "Tu carrito",
    empty: "Tu carrito está vacío.",
    continue: "Seguir comprando",
  },
} satisfies Messages;
