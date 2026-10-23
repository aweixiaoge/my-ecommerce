import { prisma } from "@my-ecommerce/db";
import type { Pagination } from "@my-ecommerce/shared";
import type { Locale } from "@/lib/languages";
import { fallbackLocales } from "../catalog/translation";
import {
  blogDetailSelect,
  blogSelect,
  toBlogPost,
  toBlogPostDetail,
  type BlogPostDetail,
  type BlogPostSummary,
} from "./blog-rows";

/**
 * The journal, as the storefront reads it.
 *
 * There is nothing to filter on. A post has no status — plan.md's Content table
 * lists one, the schema says it "arrives with the screens that write them", and
 * the admin screen that creates a post has no state to set — so every row in
 * `blogs` is a post the journal shows, and this read is "the newest N of them".
 *
 * The read is bounded by `take` because the home page's journal is a row of
 * three; the day there is a journal *page*, it is that page's read — with its
 * own pager — rather than this one with a bigger number.
 */
export async function listBlogPosts(
  limit: number,
  locale: Locale,
): Promise<BlogPostSummary[]> {
  const rows = await prisma.blog.findMany({
    // Newest first, with the id breaking a same-millisecond tie rather than the
    // query plan — the same pair `listBlogs` orders by in the admin repository,
    // so the two screens agree on what "newest" means.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: blogSelect(locale),
  });

  return rows
    .map((row) => toBlogPost(row, locale))
    .filter((post): post is BlogPostSummary => post !== null);
}

/** Posts per Journal page: three rows of the design's three columns. */
export const JOURNAL_PAGE_SIZE = 9;

/**
 * One page of the Journal, newest first, with the pager's numbers.
 *
 * The page asked for is clamped to the last one there is, so a stale or
 * hand-edited `?page=` shows the last page rather than an empty grid — the
 * rule the shop's pager follows.
 */
export async function listJournalPage(
  page: number,
  locale: Locale,
): Promise<{ items: BlogPostSummary[]; pagination: Pagination }> {
  const total = await prisma.blog.count();
  const totalPages = Math.max(1, Math.ceil(total / JOURNAL_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);

  const rows = await prisma.blog.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (current - 1) * JOURNAL_PAGE_SIZE,
    take: JOURNAL_PAGE_SIZE,
    select: blogSelect(locale),
  });

  return {
    items: rows
      .map((row) => toBlogPost(row, locale))
      .filter((post): post is BlogPostSummary => post !== null),
    pagination: { page: current, perPage: JOURNAL_PAGE_SIZE, total, totalPages },
  };
}

/**
 * A post by the slug in its address, or null when no post answers to it.
 *
 * Either the page's language's slug or English's addresses the post — the
 * product page's rule (`getProductBySlug`), for its reason: a post nobody has
 * translated is still reachable under `/de`, at its English slug. The page then
 * moves the reader to the slug of the translation it shows.
 */
export async function getBlogPostBySlug(slug: string, locale: Locale): Promise<BlogPostDetail | null> {
  const row = await prisma.blog.findFirst({
    where: { translations: { some: { slug, locale: { in: fallbackLocales(locale) } } } },
    select: blogDetailSelect(locale),
  });

  return row ? toBlogPostDetail(row, locale) : null;
}

/**
 * The slug, in this language, of the post another language's slug belongs to
 * — or null when no post has that slug in any language.
 *
 * What the language switcher needs: it swaps only the locale segment, so `/fr`
 * after `/de` arrives holding a German slug. A second query rather than a wider
 * first one, as `foreignProductPath` explains, and broken newest-first when two
 * languages spell a slug the same way, so one URL always answers the same way.
 */
export async function foreignBlogPostSlug(slug: string, locale: Locale): Promise<string | null> {
  const row = await prisma.blog.findFirst({
    where: { translations: { some: { slug } } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: blogSelect(locale),
  });

  return row ? (toBlogPost(row, locale)?.slug ?? null) : null;
}

/** The newest posts other than this one — the article page's "keep reading". */
export async function listOtherBlogPosts(
  excludeId: string,
  limit: number,
  locale: Locale,
): Promise<BlogPostSummary[]> {
  const rows = await prisma.blog.findMany({
    where: { id: { not: excludeId } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: blogSelect(locale),
  });

  return rows
    .map((row) => toBlogPost(row, locale))
    .filter((post): post is BlogPostSummary => post !== null);
}
