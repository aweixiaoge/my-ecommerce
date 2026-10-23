import type { Messages } from "../messages";

/**
 * Portuguese, as written in Portugal.
 *
 * The catalog is keyed `pt` with no region, and something has to be chosen:
 * `pt-PT` is what the storefront's German, French and Spanish siblings point
 * at, so the vocabulary is European — "auscultadores" rather than "fones de
 * ouvido", "telemóvel", "a mostrar" rather than "mostrando". A Brazilian
 * catalog is a second file and a second switcher row, not an edit to this one.
 *
 * Address is "o senhor/a senhora" avoided in favour of the third person that
 * Portuguese shops use — "Diga-nos", "o seu carrinho" — which is polite and
 * direct at once.
 */
export const pt = {
  nav: {
    home: "Início",
    shop: "Loja",
    about: "Sobre",
    journal: "Diário",
    contact: "Contacto",
    faq: "Perguntas frequentes",
    account: "A minha conta",
  },

  header: {
    brand: "Smart Mall",
    cart: "Carrinho",
    cartCount: {
      one: "Carrinho, {count} artigo",
      other: "Carrinho, {count} artigos",
    },
    openMenu: "Abrir menu",
    closeMenu: "Fechar menu",
    mobileNav: "Móvel",
    language: "Idioma: {code}",
    currency: "Moeda: {code}",
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
      "Equipamento de áudio testado por nós — auriculares, intra-auriculares e auscultadores, testados pela nossa equipa antes de chegarem ao seu carrinho.",
  },

  hero: {
    eyebrow: "Áudio testado por nós",
    fallbackTitle: "Som que acompanha o seu dia.",
    fallbackBody:
      "Auriculares sem fios, intra-auriculares e auscultadores — todos testados pela nossa equipa antes de chegarem ao seu carrinho.",
    ctaProduct: "Comprar agora",
    ctaFallback: "Ver todos os produtos",
    story: "A nossa história",
    imageAlt: "Auscultadores sem fios junto a uma linha de costa",
  },

  trustBar: [
    {
      title: "Envio grátis acima de {amount}",
      body: "Entrega normal em 5 a 7 dias úteis.",
    },
    {
      title: "Devoluções em 30 dias",
      body: "Mudou de ideias? Devolva e receba o reembolso total.",
    },
    {
      title: "Produtos testados por nós",
      body: "Cada artigo é usado e criticado primeiro pela nossa equipa.",
    },
    {
      title: "Apoio a sério",
      body: "Dúvidas antes ou depois da compra? Fale connosco.",
    },
  ],

  arrivals: {
    title: "Novidades",
    link: "Ver todos os produtos →",
  },

  whyBuy: {
    eyebrow: "Porquê comprar aqui",
    title: "Usamos o equipamento antes de o vender.",
    body: "Nada entra no catálogo sem passar pelos nossos próprios ouvidos — autonomia medida, encaixe testado, chamadas feitas numa rua movimentada. Se não se aguenta, não o vendemos.",
    cta: "Saber mais sobre nós",
    imageAlt: "Um par de auscultadores numa superfície estriada",
  },

  journal: {
    title: "Do diário",
    link: "Todos os artigos →",
  },

  /** The Journal page (Figma 178:2586): every post, newest first. */
  journalPage: {
    title: "Diário",
    description: "Guias, comparações e notas de quem testa nossos fones de ouvido.",
    empty: "Ainda não há artigos — volte em breve.",
  },

  /** A post's own page. */
  journalPost: {
    back: "Voltar ao diário",
  },

  gallery: {
    previous: "Imagem anterior",
    next: "Imagem seguinte",
    show: "Mostrar imagem {n} de {total}",
  },

  contact: {
    title: "Não sabe qual é o par certo para si?",
    body: "Diga-nos como costuma ouvir e indicamos-lhe o modelo certo — ou comece pelas perguntas que todos fazem.",
    contact: "Contacte-nos",
    faq: "Ler as perguntas frequentes",
  },

  /** The Contact page (Figma 178:7601). */
  contactPage: {
    title: "Contato",
    description: "Dúvidas sobre um pedido ou um produto? Escreva para nós e responderemos.",
    intro: "Alguma pergunta? Escreva para nós e responderemos o quanto antes.",
    name: "Nome",
    namePlaceholder: "Seu nome",
    email: "E-mail",
    emailPlaceholder: "Endereço de e-mail",
    subject: "Assunto",
    subjectPlaceholder: "Assunto",
    message: "Sua mensagem",
    messagePlaceholder: "Sua mensagem",
    /** Read aloud for the red asterisk beside a label. */
    required: "obrigatório",
    submit: "Enviar",
    sending: "Enviando…",
    sent: "Obrigado — sua mensagem foi enviada. Responderemos por e-mail.",
    sendAnother: "Enviar outra mensagem",
    getInTouch: "Fale conosco",
    /** The labels before each way of reaching the shop; the values are not copy. */
    tel: "tel.:",
    emailLabel: "e-mail:",
    whatsapp: "WhatsApp:",
    address: "endereço:",
    /** The social links' accessible group name. */
    social: "Siga-nos",
    errors: {
      required: "Preencha este campo.",
      email: "Informe um e-mail válido.",
      tooLong: "Isto é longo demais.",
      failed: "Algo deu errado. Tente novamente.",
    },
  },

  /** The FAQ page; its body is the admin's Contact → FAQ description. */
  /** The About page: the copy and images written under Contact → About. */
  aboutPage: {
    title: "Sobre nós",
    description: "Quem somos e porque testamos cada produto antes de o vender.",
    /** Shown while the admin has written nothing. */
    empty: "Ainda não escrevemos a nossa história.",
    contact: "Diga olá na página de Contato",
  },

  faqPage: {
    title: "Perguntas frequentes",
    description: "Respostas às perguntas que mais recebemos — envio, devoluções, tamanhos e cuidados.",
    /** Shown while the admin has written nothing. */
    empty: "Ainda não escrevemos nossas perguntas frequentes.",
    askUs: "Pergunte na página de Contato",
  },

  shop: {
    title: "Loja",
    description:
      "Cada auricular, intra-auricular e auscultador que vendemos — testado por nós antes de chegar ao seu carrinho.",
    bannerTitle: "Equipamento testado por nós",
    bannerBody:
      "Cada par que chega a esta página foi primeiro usado por alguém daqui. Autonomia medida ao longo de uma semana de viagens, encaixe verificado a correr, chamadas feitas numa rua movimentada. Os que não se aguentaram nunca entraram no catálogo — e o que aprendemos a testá-los está no diário.",
    bannerCta: "Saber mais",
    bannerImageAlt: "Um par de auscultadores numa superfície estriada",
  },

  listing: {
    results: "A mostrar {from}–{to} de {total} resultados",
    noResults: "Sem resultados",
    sortLabel: "Ordenar produtos",
    sortApply: "Aplicar ordenação",
    sort: {
      default: "Ordenação predefinida",
      priceAsc: "Preço, do mais baixo ao mais alto",
      priceDesc: "Preço, do mais alto ao mais baixo",
      nameAsc: "Nome, de A a Z",
    },
    pagination: "Paginação",
    next: "Seguinte",
    emptyCategory: "Ainda não há nada nesta categoria.",
    addToCart: "Adicionar ao carrinho",
  },

  product: {
    breadcrumb: "Navegação estrutural",
    home: "Início",
    description: "Descrição",
    reviews: "Avaliações ({count})",
    related: "Produtos relacionados",
    imageAlt: "Mostrar imagem de {name}",
    reviewCount: {
      one: "{count} avaliação de cliente",
      other: "{count} avaliações de clientes",
    },
    unavailable: "Indisponível nesta combinação",
    addToCart: "Adicionar ao carrinho",
    sku: "SKU:",
    category: "Categoria:",
    rangeSeparator: " – ",
  },

  reviews: {
    empty: "Ainda sem avaliações.",
    listTitle: {
      one: "{count} avaliação de {product}",
      other: "{count} avaliações de {product}",
    },
    singleRating: "Classificado com {rating} de 5",
    summary: "Classificado com {average} de 5 em {count} avaliações",
    form: {
      title: "Escrever uma avaliação",
      note: "O seu endereço de e-mail não será publicado. Os campos obrigatórios estão marcados",
      rating: "A sua classificação",
      star: { one: "{count} estrela", other: "{count} estrelas" },
      name: "Nome",
      email: "E-mail",
      body: "A sua avaliação",
      submit: "Enviar",
      sending: "A enviar…",
      thanks:
        "Obrigado pela sua avaliação: ajuda-me a melhorar os produtos.",
    },
    errors: {
      productUnknown:
        "Não foi possível identificar este produto. Recarregue a página e tente de novo.",
      saveFailed:
        "Não foi possível guardar a sua avaliação. Tente de novo e verifique se o servidor está a correr, caso continue a falhar.",
      productUnavailable:
        "Este produto já não está disponível, portanto não há nada para avaliar.",
      nameRequired: "Indique o seu nome.",
      nameTooLong: "O nome é demasiado longo.",
      emailInvalid: "Indique um endereço de e-mail válido.",
      emailTooLong: "O endereço de e-mail é demasiado longo.",
      ratingRange: "Escolha entre 1 e 5 estrelas.",
      bodyRequired: "Escreva a sua avaliação.",
      bodyTooLong: "A sua avaliação é demasiado longa.",
    },
  },

  cart: {
    title: "Carrinho",
    heading: "O seu carrinho",
    empty: "O seu carrinho está vazio.",
    continue: "Continuar a comprar",
    add: {
      adding: "A adicionar…",
      added: "Adicionado ao seu carrinho.",
      view: "Ver carrinho",
      limited: {
        one: "Só resta {count} em stock — já está no seu carrinho.",
        other: "Só restam {count} em stock — estão todos no seu carrinho.",
      },
      outOfStock: "Esgotado — não foi adicionado nada.",
      unavailable: "Este artigo já não está à venda.",
      failed: "Não foi possível adicionar ao seu carrinho. Tente novamente.",
      soldOut: "Esgotado",
      quantity: "Quantidade",
      decrease: "Menos um",
      increase: "Mais um",
    },
    menu: {
      subtotal: "Subtotal:",
      view: "Ver carrinho",
      checkout: "Finalizar",
    },
    line: {
      quantity: "Quantidade",
      decrease: "Menos um {name}",
      increase: "Mais um {name}",
      remove: "Remover",
      removeLabel: "Remover {name} do seu carrinho",
      withdrawn: "Já não está disponível. Remova-o para finalizar a compra.",
      outOfStock: "Esgotado. Remova-o para finalizar a compra.",
      limitedStock: {
        one: "Só resta {count}. Reduza a quantidade para finalizar a compra.",
        other: "Só restam {count}. Reduza a quantidade para finalizar a compra.",
      },
    },
    columns: {
      product: "Produto",
      price: "Preço",
      total: "Total",
    },
    checkout: "Finalizar compra",
    totals: "Totais do carrinho",
    coupons: "Adicionar cupões",
    couponsAtCheckout: "Introduza o seu código de cupão na finalização da compra.",
    freeShipping: "Envio grátis",
    free: "Grátis",
    shipping: "Envio",
    shippingLater: "Calculado no pagamento",
    estimatedTotal: "Total estimado",
    optionLabel: "{option}: {value}",
  },
  checkout: {
    title: "Finalizar compra",
    contact: "Informações de contacto",
    email: "Endereço de email",
    shippingAddress: "Morada de envio",
    billingAddress: "Morada de faturação",
    country: "País/Região",
    firstName: "Nome",
    lastName: "Apelido",
    address: "Morada",
    addLine2: "+ Adicionar apartamento, andar, etc.",
    line2: "Apartamento, andar, etc. (opcional)",
    city: "Cidade",
    province: "Província",
    state: "Estado",
    region: "Estado / Região (opcional)",
    selectProvince: "Selecione uma província",
    selectState: "Selecione um estado",
    postalCode: "Código postal",
    phone: "Telefone (opcional)",
    sameBilling: "Usar a mesma morada para faturação",
    shippingOptions: "Opções de envio",
    shippingPending: "Introduza uma morada de envio para ver as opções de envio.",
    standard: "Envio normal",
    standardTime: "5–7 dias úteis",
    paymentOptions: "Opções de pagamento",
    cod: "Pagamento na entrega",
    codBody: "Pague em dinheiro na entrega.",
    addNote: "Adicionar uma nota à encomenda",
    note: "Notas sobre a encomenda, p. ex. indicações para a entrega",
    terms: "Ao prosseguir com a compra, aceita os nossos Termos e Condições e a nossa Política de Privacidade",
    placeOrder: "Fazer encomenda",
    placing: "A fazer a encomenda…",
    summary: "Resumo da encomenda",
    subtotal: "Subtotal",
    delivery: "Entrega",
    deliveryPending: "Introduza a morada para calcular",
    free: "Grátis",
    total: "Total",
    quantity: "Quantidade: {count}",
    unavailableNote: "Alguns artigos do seu carrinho já não estão disponíveis e não fazem parte desta encomenda.",
    empty: "O seu carrinho está vazio, não há nada para encomendar.",
    errors: {
      required: "Este campo é obrigatório.",
      email: "Introduza um email válido.",
      tooLong: "É demasiado longo.",
      country: "Escolha um país para onde enviamos.",
      region: "Escolha uma opção da lista.",
      payment: "Escolha um método de pagamento.",
      intro: "Alguns dados precisam de ser revistos.",
      cartEmpty: "O seu carrinho está vazio — não há nada para encomendar.",
      stockChanged: "Alguns artigos esgotaram enquanto finalizava a compra. Reveja o carrinho e tente novamente.",
      failed: "Não foi possível fazer a encomenda. Tente novamente.",
      reviewCart: "Rever o carrinho",
      couponRefused: "O seu cupão já não pode ser utilizado e foi removido. Verifique o novo total e faça a encomenda novamente.",
    },
    /** The order summary's coupon box. `{code}` is the coupon's code. */
    coupon: {
      label: "Código de cupão",
      apply: "Aplicar",
      applying: "A aplicar…",
      remove: "Remover",
      applied: "Cupão {code} aplicado",
      discount: "Desconto ({code})",
      required: "Introduza um código de cupão.",
      unknown: "Este código de cupão não é válido.",
      expired: "Este cupão expirou.",
      notApplicable: "Este cupão não se aplica aos artigos do seu carrinho.",
      empty: "O seu carrinho está vazio — não há nada a descontar.",
      failed: "Não foi possível verificar o cupão. Tente novamente.",
    },
    received: {
      title: "Encomenda recebida",
      thanks: "Obrigado. A sua encomenda foi recebida.",
      number: "Número da encomenda",
      date: "Data",
      email: "Email",
      total: "Total",
      payment: "Método de pagamento",
      details: "Detalhes da encomenda",
      product: "Produto",
      subtotal: "Subtotal",
      discount: "Desconto",
      shipping: "Envio",
      shippingAddress: "Morada de envio",
      billingAddress: "Morada de faturação",
      note: "Nota",
      continue: "Continuar a comprar",
    },
  },
  account: {
    title: "A minha conta",
    login: "Iniciar sessão",
    register: "Registar",
    email: "Endereço de e-mail",
    password: "Palavra-passe",
    confirmPassword: "Confirmar palavra-passe",
    required: "obrigatório",
    showPassword: "Mostrar palavra-passe",
    hidePassword: "Ocultar palavra-passe",
    remember: "Lembrar-me",
    logIn: "Entrar",
    loggingIn: "A entrar…",
    registerButton: "Registar",
    registering: "A registar…",
    logOut: "Terminar sessão",
    dashboard: "Painel",
    orders: "Encomendas",
    addresses: "Moradas",
    menu: "Conta",
    hello: "Olá, {email} (não é {email}? {logOut})",
    intro: "No painel da sua conta pode ver as suas {orders} e gerir as suas {addresses}.",
    introOrders: "encomendas recentes",
    introAddresses: "moradas de envio e faturação",
    addressBook: {
      intro: "As moradas seguintes serão usadas por predefinição na finalização da compra.",
      billing: "Morada de faturação",
      shipping: "Morada de envio",
      editBilling: "Editar a morada de faturação",
      editShipping: "Editar a morada de envio",
      addBilling: "Adicionar uma morada de faturação",
      addShipping: "Adicionar uma morada de envio",
      empty: "Ainda não configurou este tipo de morada.",
      save: "Guardar morada",
      saving: "A guardar…",
    },
    ordersTable: {
      order: "Encomenda",
      date: "Data",
      status: "Estado",
      total: "Total",
      actions: "Ações",
      view: "Ver",
      viewOrder: "Ver a encomenda {number}",
      totalFor: {
        one: "{amount} por {count} artigo",
        other: "{amount} por {count} artigos",
      },
      empty: "Ainda não fez nenhuma encomenda.",
      browse: "Ver produtos",
    },
    status: {
      pending: "Pagamento pendente",
      paid: "Paga",
      processing: "Em processamento",
      shipped: "Enviada",
      delivered: "Entregue",
      failed: "Falhada",
      cancelled: "Cancelada",
      refunded: "Reembolsada",
    },
    errors: {
      email: "Introduza um endereço de e-mail válido.",
      password: "Introduza a sua palavra-passe.",
      passwordShort: "Use pelo menos {min} caracteres.",
      tooLong: "É demasiado longo.",
      mismatch: "As palavras-passe não coincidem.",
      invalid: "O endereço de e-mail ou a palavra-passe está incorreto.",
      taken: "Já existe uma conta com este endereço de e-mail. Inicie sessão.",
      failed: "Algo correu mal. Tente novamente.",
    },
  },
} satisfies Messages;
