import type {
  Category,
  Media,
  Money,
  Product,
  ProductSummary,
} from "@my-ecommerce/shared";

/**
 * Mock catalog.
 *
 * Every value is typed against `@my-ecommerce/shared`, so if the contract
 * changes, this file fails to typecheck — the mock cannot quietly drift from
 * the API it is standing in for.
 *
 * The getters are async on purpose: they have the same signatures the real
 * API client will have, so replacing them is a swap, not a rewrite.
 */

const USD = (amount: string): Money => ({ amount, currency: "USD" });

const noImage: Media | null = null;

const categories: Category[] = [
  {
    id: "cat_outerwear",
    slug: "outerwear",
    name: "Outerwear",
    description: "Jackets and coats built for weather.",
    image: noImage,
    parent: null,
    children: [],
    metaTitle: "Outerwear",
    metaDescription: "Jackets and coats built for weather.",
  },
  {
    id: "cat_bags",
    slug: "bags",
    name: "Bags",
    description: "Carry things properly.",
    image: noImage,
    parent: null,
    children: [],
    metaTitle: "Bags",
    metaDescription: "Carry things properly.",
  },
];

const products: Product[] = [
  {
    id: "prod_raincoat",
    slug: "storm-raincoat",
    name: "Storm Raincoat",
    description:
      "A fully seam-sealed raincoat with a storm flap and a hood that actually stays up. Cut long enough to cover a backpack, light enough to fold into its own pocket.",
    shortDescription: "Seam-sealed, packable, genuinely waterproof.",
    price: USD("189.00"),
    compareAtPrice: USD("240.00"),
    image: noImage,
    inStock: true,
    categories: [categories[0]],
    images: [],
    options: [
      {
        id: "opt_size",
        name: "Size",
        position: 0,
        values: [
          { id: "val_s", name: "S" },
          { id: "val_m", name: "M" },
          { id: "val_l", name: "L" },
        ],
      },
    ],
    variants: [
      {
        id: "var_raincoat_s",
        sku: "RC-STORM-S",
        price: USD("189.00"),
        compareAtPrice: USD("240.00"),
        stock: 4,
        inStock: true,
        optionValues: [{ id: "val_s", name: "S" }],
      },
      {
        id: "var_raincoat_m",
        sku: "RC-STORM-M",
        price: USD("189.00"),
        compareAtPrice: USD("240.00"),
        stock: 0,
        inStock: false,
        optionValues: [{ id: "val_m", name: "M" }],
      },
      {
        id: "var_raincoat_l",
        sku: "RC-STORM-L",
        price: USD("189.00"),
        compareAtPrice: USD("240.00"),
        stock: 11,
        inStock: true,
        optionValues: [{ id: "val_l", name: "L" }],
      },
    ],
    metaTitle: "Storm Raincoat",
    metaDescription: "A fully seam-sealed, packable raincoat.",
  },
  {
    id: "prod_tote",
    slug: "field-tote",
    name: "Field Tote",
    description:
      "Waxed canvas, leather base, and a strap that does not cut into your shoulder when it is full. Two internal pockets, one of which is actually big enough for a laptop.",
    shortDescription: "Waxed canvas with a leather base.",
    price: USD("145.00"),
    compareAtPrice: null,
    image: noImage,
    inStock: true,
    categories: [categories[1]],
    images: [],
    options: [
      {
        id: "opt_colour",
        name: "Colour",
        position: 0,
        values: [
          { id: "val_olive", name: "Olive" },
          { id: "val_black", name: "Black" },
        ],
      },
    ],
    variants: [
      {
        id: "var_tote_olive",
        sku: "FT-OLIVE",
        price: USD("145.00"),
        compareAtPrice: null,
        stock: 7,
        inStock: true,
        optionValues: [{ id: "val_olive", name: "Olive" }],
      },
      {
        id: "var_tote_black",
        sku: "FT-BLACK",
        price: USD("145.00"),
        compareAtPrice: null,
        stock: 2,
        inStock: true,
        optionValues: [{ id: "val_black", name: "Black" }],
      },
    ],
    metaTitle: "Field Tote",
    metaDescription: "Waxed canvas tote with a leather base.",
  },
  {
    id: "prod_beanie",
    slug: "merino-beanie",
    name: "Merino Beanie",
    description:
      "Fine-gauge merino, doubled at the brim so it holds its shape. Warm without the itch.",
    shortDescription: "Fine-gauge merino, doubled brim.",
    price: USD("45.00"),
    compareAtPrice: null,
    image: noImage,
    inStock: true,
    categories: [categories[0]],
    images: [],
    options: [],
    variants: [
      {
        id: "var_beanie_std",
        sku: "MB-STD",
        price: USD("45.00"),
        compareAtPrice: null,
        stock: 23,
        inStock: true,
        optionValues: [],
      },
    ],
    metaTitle: "Merino Beanie",
    metaDescription: "Fine-gauge merino beanie.",
  },
];

function toSummary(product: Product): ProductSummary {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
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
