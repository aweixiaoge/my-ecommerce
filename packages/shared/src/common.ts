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

/** The unwrapped type of `paginated(item)`, for code that has already validated. */
export type Paginated<T> = {
  items: T[];
  pagination: Pagination;
};

/**
 * Slices a full list into one page and builds the envelope around it.
 *
 * `page` is clamped, never rejected. `?page=99` on a two-page list is a stale
 * link or a hand-edited URL — a shopper following it should land on the last
 * page, not on an error or a blank grid. The returned `pagination.page` is the
 * page actually served, which is what the pager must mark as current.
 *
 * An empty list is one empty page with `totalPages: 0`: the UI still has a page
 * number to render, and arithmetic on `totalPages` never divides by zero.
 */
export function paginate<T>(all: T[], page: number, perPage: number): Paginated<T> {
  const total = all.length;
  const totalPages = Math.ceil(total / perPage);
  const lastPage = Math.max(totalPages, 1);

  const requested = Number.isFinite(page) ? Math.trunc(page) : 1;
  const current = Math.min(Math.max(requested, 1), lastPage);
  const start = (current - 1) * perPage;

  return {
    items: all.slice(start, start + perPage),
    pagination: { page: current, perPage, total, totalPages },
  };
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
