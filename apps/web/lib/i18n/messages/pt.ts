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

  contact: {
    title: "Não sabe qual é o par certo para si?",
    body: "Diga-nos como costuma ouvir e indicamos-lhe o modelo certo — ou comece pelas perguntas que todos fazem.",
    contact: "Contacte-nos",
    faq: "Ler as perguntas frequentes",
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
    cartNote: "O carrinho chega na fase 2.",
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
        "Obrigado — a sua avaliação chegou-nos. Aparecerá aqui assim que for aprovada.",
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
  },
} satisfies Messages;
