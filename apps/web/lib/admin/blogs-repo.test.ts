import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminBlogCreate } from "@my-ecommerce/shared";
import {
  BlogNotFoundError,
  createBlog,
  getBlogForEdit,
  listBlogs,
  UnknownCategoryError,
  updateBlog,
} from "./blogs-repo";
import { DEFAULT_LOCALE } from "../locale";
import { SlugExhaustedError } from "./slug";

/**
 * The repository, against a stand-in for the database — the same reasoning as
 * `categories-repo.test.ts` and `products-repo.test.ts`: the unit lane has no
 * external services, so what is testable here is everything above the driver.
 * For a post that is the slug retry, the claim of its images, and the two ways
 * the insert can be refused that a retry must not absorb.
 */
const db = vi.hoisted(() => ({
  blog: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  blogTranslation: { upsert: vi.fn() },
  media: { updateMany: vi.fn(), deleteMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@my-ecommerce/db", () => ({
  prisma: {
    blog: db.blog,
    blogTranslation: db.blogTranslation,
    media: db.media,
    $transaction: db.$transaction,
  },
}));

/** A payload the shared schema would have accepted. */
function payload(overrides: Partial<AdminBlogCreate> = {}): AdminBlogCreate {
  return {
    title: "How to judge earphone sound quality",
    shortDescription: "Bass, treble and soundstage.",
    description: "## The basics",
    categoryId: "cat_1",
    mediaIds: [],
    ...overrides,
  };
}

/**
 * The shape of a unique violation as it actually arrives.
 *
 * Copied from the one `categories-repo.test.ts` uses: Prisma reports the model
 * and the index under `meta.driverAdapterError` when a driver adapter is doing
 * the work, and the slug constraint's real name is what the retry answers.
 */
function uniqueViolation() {
  return Object.assign(new Error("Unique constraint failed"), {
    code: "P2002",
    meta: {
      modelName: "BlogTranslation",
      driverAdapterError: {
        cause: { constraint: { index: "blog_translations_locale_slug_key" } },
      },
    },
  });
}

/** The shape of the category's foreign key refusing the insert. */
function missingCategory() {
  return Object.assign(new Error("Foreign key constraint violated"), {
    code: "P2003",
    meta: {
      modelName: "Blog",
      driverAdapterError: {
        cause: { constraint: { index: "blogs_category_id_fkey" } },
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // The transaction hands its callback the same stand-ins the repository would
  // get from a real client, so the claiming loop runs for real in the tests.
  db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn({ blog: db.blog, blogTranslation: db.blogTranslation, media: db.media }),
  );
  db.blog.create.mockResolvedValue({ id: "blog_1" });
  db.blog.findMany.mockResolvedValue([]);
  db.media.updateMany.mockResolvedValue({ count: 1 });
  db.media.deleteMany.mockResolvedValue({ count: 0 });
  db.blog.update.mockResolvedValue({ id: "blog_1" });
  db.blogTranslation.upsert.mockResolvedValue({});
});

describe("createBlog", () => {
  it("stores the post, its translation and returns its id", async () => {
    await expect(createBlog(payload())).resolves.toBe("blog_1");

    // One nested create: the translation is the same write, so a post whose
    // title failed to store cannot exist.
    expect(db.blog.create).toHaveBeenCalledWith({
      data: {
        categoryId: "cat_1",
        translations: {
          create: {
            locale: DEFAULT_LOCALE,
            title: "How to judge earphone sound quality",
            slug: "how-to-judge-earphone-sound-quality",
            shortDescription: "Bass, treble and soundstage.",
            description: "## The basics",
          },
        },
      },
    });
  });

  it("falls back to a word rather than to an empty slug", async () => {
    // A title in a script with no ASCII still needs a URL, and the word it
    // falls back to is this entity's — not the product one the helper defaults
    // to.
    await createBlog(payload({ title: "日本語" }));

    const [call] = db.blog.create.mock.calls;
    const { slug } = (
      call[0] as { data: { translations: { create: { slug: string } } } }
    ).data.translations.create;

    expect(slug).toBe("blog");
  });

  it("tries the next slug when the first one is taken", async () => {
    db.blog.create
      .mockRejectedValueOnce(uniqueViolation())
      .mockResolvedValueOnce({ id: "blog_1" });

    await expect(createBlog(payload())).resolves.toBe("blog_1");

    const slugs = db.blog.create.mock.calls.map(
      (call) =>
        (
          call[0] as { data: { translations: { create: { slug: string } } } }
        ).data.translations.create.slug,
    );
    expect(slugs).toEqual([
      "how-to-judge-earphone-sound-quality",
      "how-to-judge-earphone-sound-quality-2",
    ]);
  });

  it("recognises a violation Prisma reported in its own shape", async () => {
    // The engine's `meta.target` rather than the adapter's cause: the retry
    // must not depend on which of the two is doing the talking.
    db.blog.create
      .mockRejectedValueOnce(
        Object.assign(new Error("Unique constraint failed"), {
          code: "P2002",
          meta: { target: ["locale", "slug"] },
        }),
      )
      .mockResolvedValueOnce({ id: "blog_1" });

    await createBlog(payload());

    expect(db.blog.create).toHaveBeenCalledTimes(2);
  });

  it("gives up once every slug it can think of is taken", async () => {
    db.blog.create.mockRejectedValue(uniqueViolation());

    await expect(createBlog(payload())).rejects.toBeInstanceOf(
      SlugExhaustedError,
    );
  });

  it("reports a category that is not a row without retrying the slug", async () => {
    // A different slug would never fix a missing category, and retrying would
    // spend a hundred attempts and then report the wrong problem.
    db.blog.create.mockRejectedValue(missingCategory());

    await expect(createBlog(payload())).rejects.toBeInstanceOf(
      UnknownCategoryError,
    );
    expect(db.blog.create).toHaveBeenCalledTimes(1);
  });

  it("does not retry an error that is not a collision", async () => {
    // A database that is not running, or a query that is wrong. Retrying would
    // hide it behind a hundred attempts and then report the wrong problem.
    const failure = new Error("connection refused");
    db.blog.create.mockRejectedValue(failure);

    await expect(createBlog(payload())).rejects.toBe(failure);
    expect(db.blog.create).toHaveBeenCalledTimes(1);
  });

  it("does not mistake a thrown non-Error for a collision", async () => {
    // `throw "boom"` and `throw null` are both legal, and reading `.code` off
    // either is how a classifier turns an odd failure into a retry loop or a
    // swallowed one.
    db.blog.create.mockRejectedValue("boom");

    await expect(createBlog(payload())).rejects.toBe("boom");
    expect(db.blog.create).toHaveBeenCalledTimes(1);

    db.blog.create.mockReset();
    db.blog.create.mockRejectedValue(null);

    await expect(createBlog(payload())).rejects.toBeNull();
    expect(db.blog.create).toHaveBeenCalledTimes(1);
  });

  it("claims each image for the post, in the order the form showed", async () => {
    await createBlog(payload({ mediaIds: ["media_a", "media_b"] }));

    expect(db.media.updateMany.mock.calls).toEqual([
      [{ where: { id: "media_a" }, data: { blogId: "blog_1", position: 0 } }],
      [{ where: { id: "media_b" }, data: { blogId: "blog_1", position: 1 } }],
    ]);
  });

  it("claims nothing when the post has no images", async () => {
    await createBlog(payload());

    expect(db.media.updateMany).not.toHaveBeenCalled();
  });
});

describe("listBlogs", () => {
  it("reads them newest first, with the id as the tiebreak", async () => {
    // One ordering key leaves the rest to Postgres, and two posts saved in the
    // same millisecond would otherwise come back in whatever order it felt.
    await listBlogs();

    expect(db.blog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
  });

  it("asks only for this locale's translation, on the category too", async () => {
    // The translation tables hold every language one day; the list shows one.
    await listBlogs();

    expect(db.blog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          translations: { where: { locale: DEFAULT_LOCALE } },
          category: {
            include: { translations: { where: { locale: DEFAULT_LOCALE } } },
          },
        },
      }),
    );
  });

  it("reduces a row to what the list shows", async () => {
    db.blog.findMany.mockResolvedValue([
      {
        id: "blog_1",
        createdAt: new Date("2026-10-01T09:30:00.000Z"),
        translations: [{ title: "How to judge sound quality" }],
        category: { translations: [{ name: "Engineer" }] },
      },
    ]);

    expect(await listBlogs()).toEqual([
      {
        id: "blog_1",
        title: "How to judge sound quality",
        categoryName: "Engineer",
        createdAt: "2026-10-01T09:30:00.000Z",
      },
    ]);
  });

  it("survives a post with no translation in this locale", async () => {
    // Not a state this app can produce — every create writes one — but a list
    // that crashes on a hand-inserted row is worse than one with a gap in it.
    db.blog.findMany.mockResolvedValue([
      {
        id: "blog_1",
        createdAt: new Date("2026-10-01T09:30:00.000Z"),
        translations: [],
        category: null,
      },
    ]);

    expect(await listBlogs()).toEqual([
      {
        id: "blog_1",
        title: "",
        categoryName: "",
        createdAt: "2026-10-01T09:30:00.000Z",
      },
    ]);
  });

  it("survives a category with no translation in this locale", async () => {
    // The category row is there and says nothing in this language — the same
    // gap as above, one step out.
    db.blog.findMany.mockResolvedValue([
      {
        id: "blog_1",
        createdAt: new Date("2026-10-01T09:30:00.000Z"),
        translations: [{ title: "How to judge sound quality" }],
        category: { translations: [] },
      },
    ]);

    expect(await listBlogs()).toEqual([
      {
        id: "blog_1",
        title: "How to judge sound quality",
        categoryName: "",
        createdAt: "2026-10-01T09:30:00.000Z",
      },
    ]);
  });
});

describe("getBlogForEdit", () => {
  it("loads the English copy, the category and the images in order", async () => {
    db.blog.findUnique.mockResolvedValue({
      id: "blog_1",
      categoryId: "cat_1",
      updatedAt: new Date("2026-10-22T08:00:00.000Z"),
      translations: [
        {
          title: "How to judge earphone sound quality",
          shortDescription: "Bass, treble and soundstage.",
          description: "## The basics",
        },
      ],
      media: [{ id: "media_a" }, { id: "media_b" }],
    });

    expect(await getBlogForEdit("blog_1")).toEqual({
      id: "blog_1",
      updatedAt: "2026-10-22T08:00:00.000Z",
      title: "How to judge earphone sound quality",
      shortDescription: "Bass, treble and soundstage.",
      description: "## The basics",
      categoryId: "cat_1",
      mediaIds: ["media_a", "media_b"],
    });
  });

  it("is null for an id that names no post", async () => {
    db.blog.findUnique.mockResolvedValue(null);

    expect(await getBlogForEdit("nope")).toBeNull();
  });
});

describe("updateBlog", () => {
  it("rewrites the category and the English row, with the slug following the title", async () => {
    await updateBlog("blog_1", payload({ title: "A new title", categoryId: "cat_2" }));

    expect(db.blog.update).toHaveBeenCalledWith({ where: { id: "blog_1" }, data: { categoryId: "cat_2" } });
    expect(db.blogTranslation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { blogId_locale: { blogId: "blog_1", locale: DEFAULT_LOCALE } },
        update: {
          title: "A new title",
          slug: "a-new-title",
          shortDescription: "Bass, treble and soundstage.",
          description: "## The basics",
        },
      }),
    );
  });

  it("claims the images in their new order and deletes the ones taken off the form", async () => {
    await updateBlog("blog_1", payload({ mediaIds: ["media_b", "media_a"] }));

    expect(db.media.updateMany.mock.calls.map(([args]) => args)).toEqual([
      { where: { id: "media_b" }, data: { blogId: "blog_1", position: 0 } },
      { where: { id: "media_a" }, data: { blogId: "blog_1", position: 1 } },
    ]);
    expect(db.media.deleteMany).toHaveBeenCalledWith({
      where: { blogId: "blog_1", id: { notIn: ["media_b", "media_a"] } },
    });
  });

  it("retries the slug when the new title collides with another post's", async () => {
    db.blogTranslation.upsert.mockRejectedValueOnce(uniqueViolation());

    await updateBlog("blog_1", payload({ title: "Taken" }));

    const slugs = db.blogTranslation.upsert.mock.calls.map(
      ([args]) => (args as { update: { slug: string } }).update.slug,
    );
    expect(slugs).toEqual(["taken", "taken-2"]);
  });

  it("names a category that is no longer a row", async () => {
    db.blog.update.mockRejectedValue(missingCategory());

    await expect(updateBlog("blog_1", payload())).rejects.toBeInstanceOf(UnknownCategoryError);
  });

  it("names a post that is no longer a row", async () => {
    db.blog.update.mockRejectedValue(Object.assign(new Error("Record to update not found"), { code: "P2025" }));

    await expect(updateBlog("gone", payload())).rejects.toBeInstanceOf(BlogNotFoundError);
  });
});
