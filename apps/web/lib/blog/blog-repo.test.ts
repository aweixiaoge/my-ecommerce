import { beforeEach, describe, expect, it, vi } from "vitest";
import { listBlogPosts } from "./blog-repo";

/**
 * The journal's read, against a stand-in for the database.
 *
 * The lane has no external services (`.claude/tdd-guardian/config.json`), so
 * what is worth asserting is the query — newest first, a bound, and the locale
 * each translation is read in — and what a row becomes on the page.
 */
const db = vi.hoisted(() => ({ blog: { findMany: vi.fn() } }));

vi.mock("@my-ecommerce/db", () => ({ prisma: { blog: db.blog } }));

/** A row as `BLOG_SELECT` returns one. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "blog_1",
    createdAt: new Date("2026-10-15T17:41:12.326Z"),
    translations: [
      {
        title: "How to judge earphone sound quality",
        slug: "how-to-judge-earphone-sound-quality",
        shortDescription: "Bass, treble and soundstage, explained.",
      },
    ],
    category: { translations: [{ name: "Engineer" }] },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.blog.findMany.mockResolvedValue([]);
});

describe("listBlogPosts", () => {
  it("takes the newest posts, in the display locale, and only that many", async () => {
    await listBlogPosts(3);

    expect(db.blog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 3,
        select: expect.objectContaining({
          translations: expect.objectContaining({
            where: { locale: "en" },
          }),
          category: expect.objectContaining({
            select: expect.objectContaining({
              translations: expect.objectContaining({
                where: { locale: "en" },
              }),
            }),
          }),
        }),
      }),
    );
  });

  it("asks for no state, because a post has none", async () => {
    // The schema lists `status` among the columns a post does not have yet, so
    // every row is one the journal shows and there is nothing to filter on.
    await listBlogPosts(3);

    const [args] = db.blog.findMany.mock.calls[0] as [{ where?: unknown }];
    expect(args.where).toBeUndefined();
  });

  it("maps the rows the journal draws", async () => {
    db.blog.findMany.mockResolvedValue([row(), row({ id: "blog_2" })]);

    const posts = await listBlogPosts(3);

    expect(posts.map((post) => post.id)).toEqual(["blog_1", "blog_2"]);
    expect(posts[0]?.category).toBe("Engineer");
    expect(posts[0]?.publishedAt).toBe("2026-10-15T17:41:12.326Z");
  });

  it("leaves out a post with nothing written in this locale", async () => {
    db.blog.findMany.mockResolvedValue([
      row({ translations: [] }),
      row({ id: "blog_2" }),
    ]);

    expect((await listBlogPosts(3)).map((post) => post.id)).toEqual(["blog_2"]);
  });

  it("has nothing to show when there are no posts", async () => {
    // The section hides itself rather than drawing a heading over an empty row.
    expect(await listBlogPosts(3)).toEqual([]);
  });
});
