import type { Prisma } from "@my-ecommerce/db";
import { DEFAULT_LOCALE } from "../locale";

/**
 * What a post row is, and how it becomes the journal's listing view.
 *
 * The same split as `catalog/product-summary.ts`: the decisions about what the
 * data means live in a file with no database in it, and the query lives in the
 * repository that calls this.
 */

/**
 * The columns a journal card is made of, and no others.
 *
 * A `select` rather than an `include`, as everywhere else: an `include` brings
 * every scalar on the relation, and a post's `description` is its whole body —
 * markdown for a page the card does not draw a line of. The cover image is not
 * here either, for the same reason: the design's card is a label, a title, an
 * excerpt and a date.
 */
export const BLOG_SELECT = {
  id: true,
  // The date the card shows. See `toBlogPost`.
  createdAt: true,
  translations: {
    where: { locale: DEFAULT_LOCALE },
    select: { title: true, slug: true, shortDescription: true },
  },
  category: {
    select: {
      translations: {
        where: { locale: DEFAULT_LOCALE },
        select: { name: true },
      },
    },
  },
} as const satisfies Prisma.BlogSelect;

/** A row as that select returns it. */
export type BlogRow = Prisma.BlogGetPayload<{ select: typeof BLOG_SELECT }>;

/**
 * A post, as the journal draws it.
 *
 * The shape the *view* reads, which is what `lib/mock/posts.ts` promised when it
 * said its local type was "shaped like the API's listing view so it can move
 * into the shared contract when the blog feature is built". It has not moved
 * into `@my-ecommerce/shared` yet: nothing outside this app reads it, and the
 * contract is where a second reader arrives.
 */
export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  /** The one-line blurb, empty when nobody has written one. */
  excerpt: string;
  /** The category's name, empty when the post is in none or has no translation. */
  category: string;
  /**
   * ISO 8601, formatted for display at the edge.
   *
   * It is the row's `created_at` today, and the name says what the card means
   * rather than which column it came from: the schema lists `published_at`
   * among the columns a post does not have yet ("they arrive with the screens
   * that write them"), and when that column lands this is the field that reads
   * it.
   */
  publishedAt: string;
}

/**
 * The row as a card, or null when there is no card to draw.
 *
 * Null means one thing: no translation in the display locale. A post with no
 * title and no slug is a card with nowhere for its link to lead, and it is
 * dropped the way `toSummary` drops a product nothing has written a name for.
 * There is no `some` filter to lean on here the way the product queries lean on
 * theirs — the translation is *selected* per locale, not filtered — so this is
 * the only place that decides it.
 *
 * The category is the one thing allowed to be absent, and its absence is an
 * empty label rather than a placeholder — the rule a product card's category
 * line already follows.
 */
export function toBlogPost(row: BlogRow): BlogPostSummary | null {
  const translation = row.translations.at(0);
  if (!translation) return null;

  return {
    id: row.id,
    slug: translation.slug,
    title: translation.title,
    excerpt: translation.shortDescription,
    category: row.category?.translations.at(0)?.name ?? "",
    publishedAt: row.createdAt.toISOString(),
  };
}
