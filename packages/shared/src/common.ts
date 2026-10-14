import { z } from "zod";

/** BCP 47 language tag, e.g. "en", "de", "pt-BR". */
export const LocaleSchema = z.string().min(2).max(5);

/** ISO 4217 currency code, e.g. "USD", "EUR". */
export const CurrencyCodeSchema = z.string().length(3);

export type Locale = z.infer<typeof LocaleSchema>;
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

export const PaginationSchema = z.object({
  page: z.number().int().positive(),
  perPage: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/** Every list endpoint returns this envelope, so the UI has one shape to paginate. */
export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    pagination: PaginationSchema,
  });
}

/**
 * Locale and currency travel differently on purpose.
 *
 * Locale is part of the URL (/de/products/...) because each translation is
 * separate content that search engines must be able to crawl. Currency is a
 * display preference carried in a cookie, so it never multiplies URLs — a
 * currency in the path would make every page crawlable in every currency.
 */
export const RequestContextSchema = z.object({
  locale: LocaleSchema,
  currency: CurrencyCodeSchema,
});

export type RequestContext = z.infer<typeof RequestContextSchema>;

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
