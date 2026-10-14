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

/** Listing view — everything a product card needs, and nothing more. */
export const ProductSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  price: MoneySchema,
  compareAtPrice: MoneySchema.nullable(),
  image: MediaSchema.nullable(),
  inStock: z.boolean(),
  categories: z.array(CategoryRefSchema),
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
