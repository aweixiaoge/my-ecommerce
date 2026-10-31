import type { Prisma } from "@my-ecommerce/db";
import { isVideoType } from "@my-ecommerce/shared";
import { IMAGES_ONLY } from "@/lib/media";
import type { Locale } from "@/lib/languages";
import {
  fallbackLocales,
  shownTranslation,
} from "../catalog/translation";

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
 * markdown for a page the card does not draw a line of. Of the images, only the
 * cover: the card shows it under the label, and the rest are the post's page's.
 */
export function blogSelect(locale: Locale) {
  return {
    id: true,
    // The date the card shows. See `toBlogPost`.
    createdAt: true,
    translations: {
      where: { locale: { in: fallbackLocales(locale) } },
      select: { title: true, slug: true, shortDescription: true, locale: true },
    },
    category: {
      select: {
        translations: {
          where: { locale: { in: fallbackLocales(locale) } },
          select: { name: true, locale: true },
        },
      },
    },
    // The admin's first photograph is the cover — the order the post's page
    // uses, skipping videos, which the card's `next/image` cannot draw.
    media: {
      where: IMAGES_ONLY,
      orderBy: [{ position: "asc" }, { id: "asc" }],
      take: 1,
      select: { id: true },
    },
  } as const satisfies Prisma.BlogSelect;
}

/** A row as that select returns it. */
export type BlogRow = Prisma.BlogGetPayload<{
  select: ReturnType<typeof blogSelect>;
}>;

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
  /** The cover's media id, null when the post has no images. */
  coverId: string | null;
}

/**
 * The row as a card, or null when there is no card to draw.
 *
 * Null means one thing: a translation in neither the language of the page nor
 * the default. A post with no title and no slug is a card with nowhere for its
 * link to lead, and it is dropped the way `toSummary` drops a product nobody
 * has written a name for. There is no `some` filter to lean on here the way the
 * product queries lean on theirs — the translation is *selected* per locale,
 * not filtered — so this is the only place that decides it.
 *
 * A post that has been translated shows the translation and links to that
 * language's slug; one that has not shows the English title at the English
 * slug, and is still readable rather than missing from the journal.
 *
 * The category is the one thing allowed to be absent, and its absence is an
 * empty label rather than a placeholder — the rule a product card's category
 * line already follows.
 */
export function toBlogPost(
  row: BlogRow,
  locale: Locale,
): BlogPostSummary | null {
  const translation = shownTranslation(row.translations, locale);
  if (!translation) return null;

  return {
    id: row.id,
    slug: translation.slug,
    title: translation.title,
    excerpt: translation.shortDescription,
    category: shownTranslation(row.category?.translations ?? [], locale)?.name ?? "",
    publishedAt: row.createdAt.toISOString(),
    coverId: row.media[0]?.id ?? null,
  };
}

/**
 * The columns a post's own page is made of: the card's, plus the body, the
 * search-result copy and the images in the order the admin arranged them.
 */
export function blogDetailSelect(locale: Locale) {
  const card = blogSelect(locale);

  return {
    ...card,
    translations: {
      ...card.translations,
      select: {
        ...card.translations.select,
        description: true,
        metaTitle: true,
        metaDescription: true,
      },
    },
    media: { orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true, mimeType: true } },
  } as const satisfies Prisma.BlogSelect;
}

export type BlogDetailRow = Prisma.BlogGetPayload<{
  select: ReturnType<typeof blogDetailSelect>;
}>;

/** A post, as its own page draws it. */
export interface BlogPostDetail extends BlogPostSummary {
  /** The body, as markdown. */
  description: string;
  /** What a search result shows; the title and excerpt when nobody wrote one. */
  metaTitle: string;
  metaDescription: string;
  /** Media ids in the admin's order, videos included. */
  imageIds: string[];
  /** Which of `imageIds` are videos, which the gallery plays rather than shows. */
  videoIds: string[];
}

/** The row as a page, or null for the reason `toBlogPost` gives. */
export function toBlogPostDetail(row: BlogDetailRow, locale: Locale): BlogPostDetail | null {
  const summary = toBlogPost(row, locale);
  const translation = shownTranslation(row.translations, locale);
  if (!summary || !translation) return null;

  return {
    ...summary,
    // The detail read takes every medium, so the cover is found rather than
    // taken: the first that is not a video, as the card's own read has it.
    coverId: row.media.find((media) => !isVideoType(media.mimeType))?.id ?? null,
    description: translation.description,
    metaTitle: translation.metaTitle || summary.title,
    metaDescription: translation.metaDescription || summary.excerpt,
    imageIds: row.media.map((media) => media.id),
    videoIds: row.media.filter((media) => isVideoType(media.mimeType)).map((media) => media.id),
  };
}
