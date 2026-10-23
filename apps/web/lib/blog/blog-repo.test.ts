import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  foreignBlogPostSlug,
  getBlogPostBySlug,
  JOURNAL_PAGE_SIZE,
  listBlogPosts,
  listJournalPage,
  listOtherBlogPosts,
} from "./blog-repo";

/**
 * The journal's read, against a stand-in for the database.
 *
 * The lane has no external services (`.claude/tdd-guardian/config.json`), so
 * what is worth asserting is the query — newest first, a bound, and the two
 * locales each translation is read in — and what a row becomes on the page.
 */
const db = vi.hoisted(() => ({ blog: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() } }));

vi.mock("@my-ecommerce/db", () => ({ prisma: { blog: db.blog } }));

/** A row as `BLOG_SELECT` returns one. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "blog_1",
    createdAt: new Date("2026-10-15T17:41:12.326Z"),
    translations: [
      {
        locale: "en",
        title: "How to judge earphone sound quality",
        slug: "how-to-judge-earphone-sound-quality",
        shortDescription: "Bass, treble and soundstage, explained.",
      },
    ],
    category: { translations: [{ locale: "en", name: "Engineer" }] },
    media: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.blog.findMany.mockResolvedValue([]);
  db.blog.count.mockResolvedValue(0);
});

describe("listBlogPosts", () => {
  it("takes the newest posts, in the page's locale and the default, and only that many", async () => {
    await listBlogPosts(3, "de");

    expect(db.blog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 3,
        select: expect.objectContaining({
          // Two locales, not one: the fallback is decided by the mapper, so
          // the query has to bring both rows back for it to decide between.
          translations: expect.objectContaining({
            where: { locale: { in: ["de", "en"] } },
          }),
          category: expect.objectContaining({
            select: expect.objectContaining({
              translations: expect.objectContaining({
                where: { locale: { in: ["de", "en"] } },
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
    await listBlogPosts(3, "en");

    const [args] = db.blog.findMany.mock.calls[0] as [{ where?: unknown }];
    expect(args.where).toBeUndefined();
  });

  it("maps the rows the journal draws", async () => {
    db.blog.findMany.mockResolvedValue([row(), row({ id: "blog_2" })]);

    const posts = await listBlogPosts(3, "en");

    expect(posts.map((post) => post.id)).toEqual(["blog_1", "blog_2"]);
    expect(posts[0]?.category).toBe("Engineer");
    expect(posts[0]?.publishedAt).toBe("2026-10-15T17:41:12.326Z");
  });

  it("asks for the cover alone, and hands its id to the card", async () => {
    db.blog.findMany.mockResolvedValue([row({ media: [{ id: "media_cover" }] }), row({ id: "blog_2" })]);

    const posts = await listBlogPosts(3, "en");

    const [args] = db.blog.findMany.mock.calls[0] as [{ select: { media: unknown } }];
    expect(args.select.media).toMatchObject({ take: 1, orderBy: [{ position: "asc" }, { id: "asc" }] });
    expect(posts.map((post) => post.coverId)).toEqual(["media_cover", null]);
  });

  it("leaves out a post with nothing written in either language", async () => {
    db.blog.findMany.mockResolvedValue([
      row({ translations: [] }),
      row({ id: "blog_2" }),
    ]);

    expect((await listBlogPosts(3, "en")).map((post) => post.id)).toEqual([
      "blog_2",
    ]);
  });

  it("keeps an untranslated post in the journal, in the default language", async () => {
    // Every post is in this state until somebody translates it, which is why
    // it is the fallback rather than the exception: a German journal with the
    // English posts in it, not an empty page.
    db.blog.findMany.mockResolvedValue([row()]);

    const [post] = await listBlogPosts(3, "de");

    expect(post?.title).toBe("How to judge earphone sound quality");
    expect(post?.category).toBe("Engineer");
  });

  it("has nothing to show when there are no posts", async () => {
    // The section hides itself rather than drawing a heading over an empty row.
    expect(await listBlogPosts(3, "en")).toEqual([]);
  });
});

describe("listJournalPage", () => {
  const args = () => db.blog.findMany.mock.calls[0]![0] as { skip: number; take: number; orderBy: unknown };

  it("reads one page, newest first, and reports the pager's numbers", async () => {
    db.blog.count.mockResolvedValue(20);
    db.blog.findMany.mockResolvedValue([row()]);

    const result = await listJournalPage(2, "en");

    expect(args()).toMatchObject({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: JOURNAL_PAGE_SIZE,
      take: JOURNAL_PAGE_SIZE,
    });
    expect(result.pagination).toEqual({ page: 2, perPage: JOURNAL_PAGE_SIZE, total: 20, totalPages: 3 });
    expect(result.items.map((post) => post.slug)).toEqual(["how-to-judge-earphone-sound-quality"]);
  });

  it("clamps a page past the end to the last page", async () => {
    db.blog.count.mockResolvedValue(10);

    const result = await listJournalPage(99, "en");

    expect(result.pagination.page).toBe(2);
    expect(args().skip).toBe(JOURNAL_PAGE_SIZE);
  });

  it("is one empty page when there are no posts", async () => {
    const result = await listJournalPage(1, "en");

    expect(result).toEqual({ items: [], pagination: { page: 1, perPage: JOURNAL_PAGE_SIZE, total: 0, totalPages: 1 } });
    expect(args().skip).toBe(0);
  });

  it("drops a post with no translation to show", async () => {
    db.blog.count.mockResolvedValue(1);
    db.blog.findMany.mockResolvedValue([row({ translations: [] })]);

    expect((await listJournalPage(1, "fr")).items).toEqual([]);
  });
});

describe("getBlogPostBySlug", () => {
  const detail = (overrides: Record<string, unknown> = {}) =>
    row({
      translations: [
        {
          locale: "en",
          title: "How to judge earphone sound quality",
          slug: "how-to-judge-earphone-sound-quality",
          shortDescription: "Bass, treble and soundstage, explained.",
          description: "## The basics",
          metaTitle: null,
          metaDescription: "",
        },
      ],
      media: [{ id: "media_cover" }, { id: "media_2" }],
      ...overrides,
    });

  it("finds the post by a slug in the page's language or English", async () => {
    db.blog.findFirst.mockResolvedValue(null);

    await getBlogPostBySlug("klang", "de");

    const [args] = db.blog.findFirst.mock.calls[0] as [{ where: unknown }];
    expect(args.where).toEqual({ translations: { some: { slug: "klang", locale: { in: ["de", "en"] } } } });
  });

  it("returns the body, the images in order, and falls back to the title and excerpt for search copy", async () => {
    db.blog.findFirst.mockResolvedValue(detail());

    expect(await getBlogPostBySlug("how-to-judge-earphone-sound-quality", "en")).toMatchObject({
      id: "blog_1",
      title: "How to judge earphone sound quality",
      description: "## The basics",
      metaTitle: "How to judge earphone sound quality",
      metaDescription: "Bass, treble and soundstage, explained.",
      imageIds: ["media_cover", "media_2"],
      category: "Engineer",
    });
  });

  it("is null when no post answers to the slug", async () => {
    db.blog.findFirst.mockResolvedValue(null);

    expect(await getBlogPostBySlug("nope", "en")).toBeNull();
  });
});

describe("foreignBlogPostSlug", () => {
  it("finds the post by a slug in any language and answers with this language's slug", async () => {
    db.blog.findFirst.mockResolvedValue(
      row({
        translations: [
          { locale: "fr", title: "Juger le son", slug: "juger-le-son", shortDescription: "" },
          { locale: "en", title: "Judge the sound", slug: "judge-the-sound", shortDescription: "" },
        ],
      }),
    );

    expect(await foreignBlogPostSlug("klang-beurteilen", "fr")).toBe("juger-le-son");
    const [args] = db.blog.findFirst.mock.calls[0] as [{ where: unknown }];
    expect(args.where).toEqual({ translations: { some: { slug: "klang-beurteilen" } } });
  });

  it("is null when no language has the slug", async () => {
    db.blog.findFirst.mockResolvedValue(null);

    expect(await foreignBlogPostSlug("nope", "fr")).toBeNull();
  });
});

describe("listOtherBlogPosts", () => {
  it("takes the newest posts except the one being read", async () => {
    db.blog.findMany.mockResolvedValue([row({ id: "blog_2" })]);

    const posts = await listOtherBlogPosts("blog_1", 3, "en");

    expect(posts.map((post) => post.id)).toEqual(["blog_2"]);
    const [args] = db.blog.findMany.mock.calls[0] as [{ where: unknown; take: number }];
    expect(args).toMatchObject({ where: { id: { not: "blog_1" } }, take: 3 });
  });
});
