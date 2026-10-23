import { z } from "zod";
import { MoneySchema } from "./money";

/**
 * These schemas describe RESOLVED content: the API takes a locale and returns
 * text already in that language. The UI never receives a map of translations,
 * and never picks a language itself. Translation tables are a storage detail.
 */

export const MediaSchema = z.object({
  id: z.string(),
  url: z.string(),
  /** Alt text is an SEO field, translated per locale like any other copy. */
  alt: z.string().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  position: z.number().int().nonnegative(),
  /**
   * What to draw it with. Absent means an image — every reader that predates
   * product videos, and every surface that only ever shows images, can leave
   * it out.
   */
  kind: z.enum(["image", "video"]).optional(),
});

export type Media = z.infer<typeof MediaSchema>;

export const OptionValueSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type OptionValue = z.infer<typeof OptionValueSchema>;

export const ProductOptionSchema = z.object({
  id: z.string(),
  /** "Size", "Colour" — translated. */
  name: z.string(),
  position: z.number().int().nonnegative(),
  values: z.array(OptionValueSchema),
});

export type ProductOption = z.infer<typeof ProductOptionSchema>;

export const CategoryRefSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
});

export type CategoryRef = z.infer<typeof CategoryRefSchema>;

export const CategorySchema = CategoryRefSchema.extend({
  description: z.string().nullable(),
  image: MediaSchema.nullable(),
  parent: CategoryRefSchema.nullable(),
  children: z.array(CategoryRefSchema),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
});

export type Category = z.infer<typeof CategorySchema>;

export const VariantSchema = z.object({
  id: z.string(),
  sku: z.string(),
  price: MoneySchema,
  compareAtPrice: MoneySchema.nullable(),
  /** Raw stock is exposed so the UI can cap quantity selectors. */
  stock: z.number().int().nonnegative(),
  inStock: z.boolean(),
  /** The option values that select this variant, e.g. [Size: M, Colour: Black]. */
  optionValues: z.array(OptionValueSchema),
});

export type Variant = z.infer<typeof VariantSchema>;

/**
 * The aggregate review score a listing card renders as stars.
 *
 * Null is "no reviews yet", which is NOT the same as an average of 0 — an
 * unreviewed product must render no stars at all rather than one out of five.
 *
 * The figures are computed live from the approved `reviews` rows — a `groupBy`
 * per read rather than plan.md's denormalised `product_review_stats` table, so
 * the stars a card shows and the stars the product page shows cannot disagree.
 * "No reviews" therefore arrives as a product the aggregate says nothing about,
 * rather than as a stats row holding zeroes.
 */
export const ProductRatingSchema = z.object({
  average: z.number().min(0).max(5),
  count: z.number().int().nonnegative(),
});

export type ProductRating = z.infer<typeof ProductRatingSchema>;

/**
 * The orders a product list accepts. A closed set, shared with the API, so the
 * URL, the query, and the SQL `ORDER BY` cannot drift into three vocabularies.
 */
export const ProductSortSchema = z.enum([
  "default",
  "price-asc",
  "price-desc",
  "name-asc",
]);

export type ProductSort = z.infer<typeof ProductSortSchema>;

/** Listing view — everything a product card needs, and nothing more. */
export const ProductSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  /**
   * `price` is the LOWEST purchasable price; `priceMax` is the highest, and is
   * null when every variant costs the same. Cards render a range only when the
   * two differ — the home design shows "$18.00 – $21.00" for a product whose
   * variants span that spread, and a single figure for one that does not.
   */
  price: MoneySchema,
  priceMax: MoneySchema.nullable(),
  compareAtPrice: MoneySchema.nullable(),
  image: MediaSchema.nullable(),
  inStock: z.boolean(),
  categories: z.array(CategoryRefSchema),
  rating: ProductRatingSchema.nullable(),
});

export type ProductSummary = z.infer<typeof ProductSummarySchema>;

/** Detail view — the full product page. */
export const ProductSchema = ProductSummarySchema.extend({
  description: z.string(),
  shortDescription: z.string().nullable(),
  images: z.array(MediaSchema),
  options: z.array(ProductOptionSchema),
  variants: z.array(VariantSchema),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
});

export type Product = z.infer<typeof ProductSchema>;
