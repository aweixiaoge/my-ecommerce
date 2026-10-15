import type {
  Category,
  Money,
  Paginated,
  Product,
  ProductRating,
  ProductSort,
  ProductSummary,
  Variant,
} from "@my-ecommerce/shared";
import { compareMoney, paginate } from "@my-ecommerce/shared";
import { SHOP_PAGE_SIZE, sortProducts } from "@/lib/shop";

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
  /**
   * [average, count]. Every product here has been reviewed — the shop card
   * renders a star row for each, as the design shows. A product with no
   * reviews carries `null` and renders no stars at all; the contract and the
   * card both handle that, there is just none in the fixture.
   */
  rating: [number, number];
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
    rating: [4.4, 128],
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
    rating: [4.3, 64],
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
    rating: [4.2, 91],
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
    rating: [4.1, 37],
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
    rating: [4.4, 212],
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
    rating: [4.2, 48],
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
    rating: [4.3, 156],
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
    rating: [4.1, 73],
  },
  {
    slug: "bone-conduction-headphones",
    name: "Bone Conduction Headphones",
    description:
      "Sits on your cheekbone and leaves both ears open, so you hear the road as well as the podcast. The trade is bass: there is none to speak of.",
    shortDescription: "Open-ear, with nothing in your ear canal.",
    category: categories[1],
    options: [],
    variants: [
      {
        id: "var_bone",
        sku: "BONE-OC",
        price: USD("119.00"),
        compareAtPrice: null,
        stock: 9,
        inStock: true,
        optionValues: [],
      },
    ],
    rating: [4.2, 29],
  },
  {
    slug: "open-ear-sport-earphones",
    name: "Open-Ear Sport Earphones",
    description:
      "A hook over the ear rather than a plug in it. Stays on through a sprint, washes down under a tap.",
    shortDescription: "Hook-over fit that stays on through a sprint.",
    category: categories[0],
    options: [],
    variants: [
      {
        id: "var_openea",
        sku: "OE-SPT",
        price: USD("47.00"),
        compareAtPrice: USD("55.00"),
        stock: 14,
        inStock: true,
        optionValues: [],
      },
    ],
    compareAtPrice: USD("55.00"),
    rating: [4.3, 56],
  },
  {
    slug: "wooden-headphone-stand",
    name: "Wooden Headphone Stand",
    description:
      "Solid ash with a felt cradle, so the headband rests instead of creasing. Heavy enough not to follow the cable off the desk.",
    shortDescription: "Solid ash with a felt cradle.",
    category: categories[2],
    options: [],
    variants: [
      {
        id: "var_stand",
        sku: "STD-WOOD",
        price: USD("32.00"),
        compareAtPrice: null,
        stock: 22,
        inStock: true,
        optionValues: [],
      },
    ],
    rating: [4.4, 41],
  },
  {
    slug: "braided-replacement-cable",
    name: "Braided Replacement Cable",
    description:
      "Two metres of braided cable with gold-plated jacks at both ends. The strain relief is the part that usually fails, so it is the part that is overbuilt.",
    shortDescription: "Two metres, braided, overbuilt strain relief.",
    category: categories[2],
    options: [],
    variants: [
      {
        id: "var_cable",
        sku: "CBL-BR2",
        price: USD("14.00"),
        compareAtPrice: null,
        stock: 60,
        inStock: true,
        optionValues: [],
      },
    ],
    rating: [4.2, 187],
  },
  {
    slug: "travel-carry-case",
    name: "Travel Carry Case",
    description:
      "Moulded shell, zip pull you can find by feel, and a pocket sized for a cable and an adapter. Fits the over-ears folded flat.",
    shortDescription: "Moulded shell with a cable pocket.",
    category: categories[2],
    options: [],
    variants: [
      {
        id: "var_case",
        sku: "CSE-TRVL",
        price: USD("24.00"),
        compareAtPrice: null,
        stock: 3,
        inStock: true,
        optionValues: [],
      },
    ],
    rating: [4.1, 95],
  },
];

const products: Product[] = seeds.map((seed) => {
  const stock = seed.variants.reduce((n, v) => n + v.stock, 0);
  const prices = seed.variants.map((v) => v.price).sort(compareMoney);
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
    rating: toRating(seed.rating),
    metaTitle: seed.name,
    metaDescription: seed.shortDescription,
  };
});

/** Seeds carry the pair so the fixture stays one line per product. */
function toRating([average, count]: [number, number]): ProductRating {
  return { average, count };
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
    rating: product.rating,
  };
}

export async function getProducts(): Promise<ProductSummary[]> {
  return products.map(toSummary);
}

/**
 * One page of the shop listing, ordered and paginated the way the API will.
 *
 * Sorting and slicing live here rather than in the page because they are the
 * server's job: `?page=` and `?sort=` are query parameters, and a client that
 * filtered its own copy of the catalogue could not be paginated, crawled, or
 * trusted. The day this is swapped for `fetch`, nothing above it changes.
 */
export async function getShopProducts(query: {
  page: number;
  sort: ProductSort;
}): Promise<Paginated<ProductSummary>> {
  return paginate(sortProducts(products.map(toSummary), query.sort), query.page, SHOP_PAGE_SIZE);
}

/** How many products the home page's "New arrivals" grid shows. */
export async function getNewArrivals(limit: number): Promise<ProductSummary[]> {
  return products.slice(0, limit).map(toSummary);
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
