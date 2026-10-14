import type {
  Category,
  Money,
  Product,
  ProductSummary,
  Variant,
} from "@my-ecommerce/shared";

/**
 * Mock catalog for the Smart Mall storefront.
 *
 * Every value is typed against `@my-ecommerce/shared`, so if the contract
 * changes this file fails to typecheck — the mock cannot quietly drift from
 * the API it stands in for.
 *
 * The getters are async on purpose: they have the same signatures the real API
 * client will have, so replacing them is a swap, not a rewrite.
 */

const USD = (amount: string): Money => ({ amount, currency: "USD" });

const SIZES = [
  { id: "val_s", name: "S" },
  { id: "val_m", name: "M" },
  { id: "val_l", name: "L" },
];

const SIZE_VARIANTS = (sku: string, prices: [string, string, string]): Variant[] =>
  SIZES.map((size, i) => ({
    id: `var_${sku}_${size.name.toLowerCase()}`,
    sku: `${sku}-${size.name}`,
    price: USD(prices[i]),
    compareAtPrice: null,
    stock: [4, 0, 11][i],
    inStock: [true, false, true][i],
    optionValues: [size],
  }));

const SIZE_OPTION = {
  id: "opt_size",
  name: "Size",
  position: 0,
  values: SIZES,
};

/** One photo stands in for all eight cards, as it does in the design. */
function productImage(alt: string) {
  return {
    id: "media_earbuds",
    url: "/images/product-earbuds.jpg",
    alt,
    width: 300,
    height: 300,
    position: 0,
  };
}

const categories: Category[] = [
  {
    id: "cat_earbuds",
    slug: "earbuds",
    name: "Earbuds",
    description: "In-ear and true wireless.",
    image: null,
    parent: null,
    children: [],
    metaTitle: "Earbuds",
    metaDescription: "In-ear and true wireless earbuds.",
  },
  {
    id: "cat_headphones",
    slug: "headphones",
    name: "Headphones",
    description: "On-ear and over-ear.",
    image: null,
    parent: null,
    children: [],
    metaTitle: "Headphones",
    metaDescription: "On-ear and over-ear headphones.",
  },
  {
    id: "cat_accessories",
    slug: "accessories",
    name: "Accessories",
    description: "The bits that make the gear last.",
    image: null,
    parent: null,
    children: [],
    metaTitle: "Accessories",
    metaDescription: "Cases, cushions, adapters and cables.",
  },
];

type Seed = {
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  category: Category;
  variants: Variant[];
  options: Product["options"];
  compareAtPrice?: Money;
};

const seeds: Seed[] = [
  {
    slug: "earbud-wireless-bluetooth",
    name: "Earbud Wireless Bluetooth",
    description:
      "Six hours on a charge, another eighteen in the case. The tips come in three sizes because the seal is what the bass depends on.",
    shortDescription: "Six hours on a charge, eighteen more in the case.",
    category: categories[0],
    options: [SIZE_OPTION],
    variants: SIZE_VARIANTS("EWB", ["18.00", "19.00", "21.00"]),
  },
  {
    slug: "studio-over-ear",
    name: "Studio Over-Ear Headphones",
    description:
      "Closed-back, flat response, replaceable everything. Built for long sessions rather than short commutes.",
    shortDescription: "Closed-back with a flat response.",
    category: categories[1],
    options: [],
    variants: [
      {
        id: "var_studio",
        sku: "ST-OVER",
        price: USD("89.00"),
        compareAtPrice: USD("109.00"),
        stock: 7,
        inStock: true,
        optionValues: [],
      },
    ],
    compareAtPrice: USD("109.00"),
  },
  {
    slug: "sport-in-ear-buds",
    name: "Sport In-Ear Buds",
    description:
      "Sweat-sealed hooks that stay put through a run. Rated IPX5, which is more than most people will ever test.",
    shortDescription: "Sweat-sealed hooks rated IPX5.",
    category: categories[0],
    options: [SIZE_OPTION],
    variants: SIZE_VARIANTS("SPT", ["34.00", "37.00", "39.00"]),
  },
  {
    slug: "noise-cancelling-headphones",
    name: "Noise-Cancelling Headphones",
    description:
      "Active cancellation with a transparency mode you will actually use. Thirty hours with it on.",
    shortDescription: "Active cancellation, thirty hours.",
    category: categories[1],
    options: [SIZE_OPTION],
    variants: SIZE_VARIANTS("ANC", ["149.00", "165.00", "179.00"]),
  },
  {
    slug: "wired-earphones",
    name: "Wired Earphones",
    description:
      "No battery, no pairing, no latency. Still the right answer for a desk.",
    shortDescription: "No battery, no pairing, no latency.",
    category: categories[0],
    options: [],
    variants: [
      {
        id: "var_wired",
        sku: "WR-EAR",
        price: USD("12.00"),
        compareAtPrice: null,
        stock: 40,
        inStock: true,
        optionValues: [],
      },
    ],
  },
  {
    slug: "portable-bluetooth-speaker",
    name: "Portable Bluetooth Speaker",
    description:
      "Loud enough for a kitchen, small enough for a bag. Floats, which we did not expect either.",
    shortDescription: "Loud enough for a kitchen. Floats.",
    category: categories[2],
    options: [],
    variants: [
      {
        id: "var_speaker",
        sku: "SPK-PORT",
        price: USD("59.00"),
        compareAtPrice: null,
        stock: 5,
        inStock: true,
        optionValues: [],
      },
    ],
  },
  {
    slug: "usb-c-audio-adapter",
    name: "USB-C Audio Adapter",
    description:
      "A DAC in a plug the size of your thumbnail. Fixes the headphone jack problem properly.",
    shortDescription: "A DAC the size of your thumbnail.",
    category: categories[2],
    options: [],
    variants: [
      {
        id: "var_adapter",
        sku: "ADP-USBC",
        price: USD("9.00"),
        compareAtPrice: null,
        stock: 0,
        inStock: false,
        optionValues: [],
      },
    ],
  },
  {
    slug: "replacement-ear-cushions",
    name: "Replacement Ear Cushions",
    description:
      "Memory foam, protein leather, and a fit designed to be taken off and put back on without tearing.",
    shortDescription: "Memory foam and protein leather.",
    category: categories[2],
    options: [SIZE_OPTION],
    variants: SIZE_VARIANTS("CUSH", ["15.00", "17.00", "19.00"]),
  },
];

const products: Product[] = seeds.map((seed) => {
  const stock = seed.variants.reduce((n, v) => n + v.stock, 0);
  const prices = seed.variants.map((v) => v.price).sort(byAmount);
  const min = prices[0];
  const max = prices[prices.length - 1];

  return {
    id: `prod_${seed.slug}`,
    slug: seed.slug,
    name: seed.name,
    description: seed.description,
    shortDescription: seed.shortDescription,
    price: min,
    priceMax: max.amount === min.amount ? null : max,
    compareAtPrice: seed.compareAtPrice ?? null,
    image: productImage(seed.name),
    inStock: stock > 0,
    categories: [seed.category],
    images: [productImage(seed.name)],
    options: seed.options,
    variants: seed.variants,
    metaTitle: seed.name,
    metaDescription: seed.shortDescription,
  };
});

/**
 * Ordering only. The amounts themselves are never converted — no money value
 * passes through a float here, and the real API computes min/max in Decimal.
 */
function byAmount(a: Money, b: Money): number {
  return Number(a.amount) - Number(b.amount);
}

function toSummary(product: Product): ProductSummary {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    priceMax: product.priceMax,
    compareAtPrice: product.compareAtPrice,
    image: product.image,
    inStock: product.inStock,
    categories: product.categories,
  };
}

export async function getProducts(): Promise<ProductSummary[]> {
  return products.map(toSummary);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return products.find((p) => p.slug === slug) ?? null;
}

export async function getProductSlugs(): Promise<string[]> {
  return products.map((p) => p.slug);
}

export async function getCategories(): Promise<Category[]> {
  return categories;
}
