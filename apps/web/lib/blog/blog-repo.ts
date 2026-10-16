import { prisma } from "@my-ecommerce/db";
import { BLOG_SELECT, toBlogPost, type BlogPostSummary } from "./blog-rows";

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
export async function listBlogPosts(limit: number): Promise<BlogPostSummary[]> {
  const rows = await prisma.blog.findMany({
    // Newest first, with the id breaking a same-millisecond tie rather than the
    // query plan — the same pair `listBlogs` orders by in the admin repository,
    // so the two screens agree on what "newest" means.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: BLOG_SELECT,
  });

  return rows
    .map(toBlogPost)
    .filter((post): post is BlogPostSummary => post !== null);
}
