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
    cartCount: {
      one: "Carrito, {count} artículo",
      other: "Carrito, {count} artículos",
    },
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

  /** The Journal page (Figma 178:2586): every post, newest first. */
  journalPage: {
    title: "Diario",
    description: "Guías, comparativas y notas de quienes prueban nuestros auriculares.",
    empty: "Todavía no hay artículos. Vuelve pronto.",
  },

  /** A post's own page. */
  journalPost: {
    back: "Volver al diario",
  },

  gallery: {
    show: "Mostrar imagen {n} de {total}",
  },

  contact: {
    title: "¿No sabes qué par es el tuyo?",
    body: "Cuéntanos cómo escuchas y te orientamos hacia el modelo adecuado — o empieza por las preguntas que todos hacen.",
    contact: "Contacta con nosotros",
    faq: "Leer las preguntas frecuentes",
  },

  /** The Contact page (Figma 178:7601). */
  contactPage: {
    title: "Contacto",
    description: "¿Dudas sobre un pedido o un producto? Escríbenos y te responderemos.",
    intro: "¿Alguna pregunta? Escríbenos y te responderemos lo antes posible.",
    name: "Nombre",
    namePlaceholder: "Tu nombre",
    email: "Correo electrónico",
    emailPlaceholder: "Dirección de correo",
    subject: "Asunto",
    subjectPlaceholder: "Asunto",
    message: "Tu mensaje",
    messagePlaceholder: "Tu mensaje",
    /** Read aloud for the red asterisk beside a label. */
    required: "obligatorio",
    submit: "Enviar",
    sending: "Enviando…",
    sent: "Gracias: tu mensaje está en camino. Te responderemos por correo.",
    sendAnother: "Enviar otro mensaje",
    getInTouch: "Ponte en contacto",
    /** The labels before each way of reaching the shop; the values are not copy. */
    tel: "tel.:",
    emailLabel: "correo:",
    whatsapp: "WhatsApp:",
    address: "dirección:",
    /** The social links' accessible group name. */
    social: "Síguenos",
    errors: {
      required: "Rellena este campo.",
      email: "Introduce un correo electrónico válido.",
      tooLong: "Es demasiado largo.",
      failed: "Algo salió mal. Inténtalo de nuevo.",
    },
  },

  /** The FAQ page; its body is the admin's Contact → FAQ description. */
  /** The About page: the copy and images written under Contact → About. */
  aboutPage: {
    title: "Sobre nosotros",
    description: "Quiénes somos y por qué probamos cada producto antes de venderlo.",
    /** Shown while the admin has written nothing. */
    empty: "Todavía no hemos escrito nuestra historia.",
    contact: "Salúdanos en la página de contacto",
  },

  faqPage: {
    title: "Preguntas frecuentes",
    description: "Respuestas a las preguntas que más nos hacen: envíos, devoluciones, tallas y cuidado.",
    /** Shown while the admin has written nothing. */
    empty: "Todavía no hemos escrito nuestras preguntas frecuentes.",
    askUs: "Pregúntanos en la página de contacto",
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
        "Gracias por tu reseña: me ayuda a mejorar los productos.",
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
    add: {
      adding: "Añadiendo…",
      added: "Añadido a tu carrito.",
      view: "Ver carrito",
      limited: {
        one: "Solo queda {count} en stock — ya está en tu carrito.",
        other: "Solo quedan {count} en stock — todos están en tu carrito.",
      },
      outOfStock: "Agotado — no se ha añadido nada.",
      unavailable: "Este artículo ya no está a la venta.",
      failed: "No se ha podido añadir a tu carrito. Inténtalo de nuevo.",
      soldOut: "Agotado",
      quantity: "Cantidad",
      decrease: "Uno menos",
      increase: "Uno más",
    },
    menu: {
      subtotal: "Subtotal:",
      view: "Ver carrito",
      checkout: "Pagar",
    },
    line: {
      quantity: "Cantidad",
      decrease: "Un {name} menos",
      increase: "Un {name} más",
      remove: "Quitar",
      removeLabel: "Quitar {name} de tu carrito",
      withdrawn: "Ya no está disponible. Quítalo para pagar.",
      outOfStock: "Agotado. Quítalo para pagar.",
      limitedStock: {
        one: "Solo queda {count}. Reduce la cantidad para pagar.",
        other: "Solo quedan {count}. Reduce la cantidad para pagar.",
      },
    },
    columns: {
      product: "Producto",
      price: "Precio",
      total: "Total",
    },
    checkout: "Ir a pagar",
    totals: "Totales del carrito",
    coupons: "Añadir cupones",
    couponsAtCheckout: "Introduce tu código de cupón al finalizar la compra.",
    freeShipping: "Envío gratis",
    free: "Gratis",
    shipping: "Envío",
    shippingLater: "Se calcula al pagar",
    estimatedTotal: "Total estimado",
    optionLabel: "{option}: {value}",
  },
  checkout: {
    title: "Finalizar compra",
    contact: "Información de contacto",
    email: "Correo electrónico",
    shippingAddress: "Dirección de envío",
    billingAddress: "Dirección de facturación",
    country: "País/Región",
    firstName: "Nombre",
    lastName: "Apellidos",
    address: "Dirección",
    addLine2: "+ Añadir apartamento, piso, etc.",
    line2: "Apartamento, piso, etc. (opcional)",
    city: "Ciudad",
    province: "Provincia",
    state: "Estado",
    region: "Estado / Región (opcional)",
    selectProvince: "Selecciona una provincia",
    selectState: "Selecciona un estado",
    postalCode: "Código postal",
    phone: "Teléfono (opcional)",
    sameBilling: "Usar la misma dirección para la facturación",
    shippingOptions: "Opciones de envío",
    shippingPending: "Introduce una dirección de envío para ver las opciones de envío.",
    standard: "Envío estándar",
    standardTime: "5–7 días laborables",
    paymentOptions: "Opciones de pago",
    cod: "Contra reembolso",
    codBody: "Paga en efectivo al recibir el pedido.",
    addNote: "Añadir una nota a tu pedido",
    note: "Notas sobre tu pedido, p. ej. indicaciones para la entrega",
    terms: "Al continuar con tu compra aceptas nuestros Términos y condiciones y nuestra Política de privacidad",
    placeOrder: "Realizar pedido",
    placing: "Realizando pedido…",
    summary: "Resumen del pedido",
    subtotal: "Subtotal",
    delivery: "Entrega",
    deliveryPending: "Introduce una dirección para calcular",
    free: "Gratis",
    total: "Total",
    quantity: "Cantidad: {count}",
    unavailableNote: "Algunos artículos de tu carrito ya no se pueden comprar y no forman parte de este pedido.",
    empty: "Tu carrito está vacío, así que no hay nada que pagar.",
    errors: {
      required: "Este campo es obligatorio.",
      email: "Introduce un correo electrónico válido.",
      tooLong: "Es demasiado largo.",
      country: "Elige un país al que enviemos.",
      region: "Elige una opción de la lista.",
      payment: "Elige un método de pago.",
      intro: "Hay datos que necesitan revisión.",
      cartEmpty: "Tu carrito está vacío: no hay nada que pedir.",
      stockChanged: "Algunos artículos se agotaron mientras pagabas. Revisa tu carrito e inténtalo de nuevo.",
      failed: "No se ha podido realizar tu pedido. Inténtalo de nuevo.",
      reviewCart: "Revisar el carrito",
      couponRefused: "Tu cupón ya no se puede usar y se ha quitado. Revisa el nuevo total y vuelve a realizar tu pedido.",
    },
    /** The order summary's coupon box. `{code}` is the coupon's code. */
    coupon: {
      label: "Código de cupón",
      apply: "Aplicar",
      applying: "Aplicando…",
      remove: "Quitar",
      applied: "Cupón {code} aplicado",
      discount: "Descuento ({code})",
      required: "Introduce un código de cupón.",
      unknown: "Este código de cupón no es válido.",
      expired: "Este cupón ha caducado.",
      notApplicable: "Este cupón no se aplica a los artículos de tu carrito.",
      empty: "Tu carrito está vacío: no hay nada a lo que aplicar un descuento.",
      failed: "No se ha podido comprobar el cupón. Inténtalo de nuevo.",
    },
    received: {
      title: "Pedido recibido",
      thanks: "Gracias. Hemos recibido tu pedido.",
      number: "Número de pedido",
      date: "Fecha",
      email: "Correo electrónico",
      total: "Total",
      payment: "Método de pago",
      details: "Detalles del pedido",
      product: "Producto",
      subtotal: "Subtotal",
      discount: "Descuento",
      shipping: "Envío",
      shippingAddress: "Dirección de envío",
      billingAddress: "Dirección de facturación",
      note: "Nota",
      continue: "Seguir comprando",
    },
  },
  account: {
    title: "Mi cuenta",
    login: "Acceder",
    register: "Registrarse",
    email: "Correo electrónico",
    password: "Contraseña",
    confirmPassword: "Confirmar contraseña",
    required: "obligatorio",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    remember: "Recordarme",
    logIn: "Acceder",
    loggingIn: "Accediendo…",
    registerButton: "Registrarse",
    registering: "Registrando…",
    logOut: "Cerrar sesión",
    dashboard: "Escritorio",
    orders: "Pedidos",
    addresses: "Direcciones",
    menu: "Cuenta",
    hello: "Hola, {email} (¿no eres {email}? {logOut})",
    intro: "Desde el escritorio de tu cuenta puedes ver tus {orders} y gestionar tus {addresses}.",
    introOrders: "pedidos recientes",
    introAddresses: "direcciones de envío y facturación",
    addressBook: {
      intro: "Las siguientes direcciones se usarán por defecto al finalizar la compra.",
      billing: "Dirección de facturación",
      shipping: "Dirección de envío",
      editBilling: "Editar la dirección de facturación",
      editShipping: "Editar la dirección de envío",
      addBilling: "Añadir una dirección de facturación",
      addShipping: "Añadir una dirección de envío",
      empty: "Todavía no has configurado este tipo de dirección.",
      save: "Guardar dirección",
      saving: "Guardando…",
    },
    ordersTable: {
      order: "Pedido",
      date: "Fecha",
      status: "Estado",
      total: "Total",
      actions: "Acciones",
      view: "Ver",
      viewOrder: "Ver el pedido {number}",
      totalFor: {
        one: "{amount} por {count} artículo",
        other: "{amount} por {count} artículos",
      },
      empty: "Todavía no has hecho ningún pedido.",
      browse: "Ver productos",
    },
    status: {
      pending: "Pendiente de pago",
      paid: "Pagado",
      processing: "Procesando",
      shipped: "Enviado",
      delivered: "Entregado",
      failed: "Fallido",
      cancelled: "Cancelado",
      refunded: "Reembolsado",
    },
    errors: {
      email: "Introduce un correo electrónico válido.",
      password: "Introduce tu contraseña.",
      passwordShort: "Usa al menos {min} caracteres.",
      tooLong: "Es demasiado largo.",
      mismatch: "Las contraseñas no coinciden.",
      invalid: "El correo electrónico o la contraseña no son correctos.",
      taken: "Ya hay una cuenta con este correo electrónico. Accede en su lugar.",
      failed: "Algo ha fallado. Inténtalo de nuevo.",
    },
  },
} satisfies Messages;
