import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminBlogCategoryCreate } from "@my-ecommerce/shared";
import {
  createBlogCategory,
  listBlogCategories,
} from "./blog-categories-repo";
import { DEFAULT_LOCALE } from "../locale";
import { SlugExhaustedError } from "./slug";

/**
 * The repository, against a stand-in for the database — the same reasoning as
 * `categories-repo.test.ts`, whose cases this file deliberately mirrors: the
 * retry a taken slug forces is the same shape, and the day one of the two
 * changes the difference should be visible in a diff of these two files.
 */
const db = vi.hoisted(() => ({
  blogCategory: { create: vi.fn(), findMany: vi.fn() },
}));

vi.mock("@my-ecommerce/db", () => ({
  prisma: { blogCategory: db.blogCategory },
}));

/** A payload the shared schema would have accepted. */
function payload(
  overrides: Partial<AdminBlogCategoryCreate> = {},
): AdminBlogCategoryCreate {
  return { name: "Engineer", ...overrides };
}

/** The shape of a unique violation as it actually arrives. */
function uniqueViolation(modelName: string, constraint: string) {
  return Object.assign(new Error("Unique constraint failed"), {
    code: "P2002",
    meta: {
      modelName,
      driverAdapterError: { cause: { constraint: { index: constraint } } },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  db.blogCategory.create.mockResolvedValue({ id: "bcat_1" });
  db.blogCategory.findMany.mockResolvedValue([]);
});

describe("createBlogCategory", () => {
  it("stores the category and returns its id", async () => {
    await expect(createBlogCategory(payload())).resolves.toBe("bcat_1");
  });

  it("writes the name and the derived slug into the locale's translation", async () => {
    // Two rows behind one field: text lives in an `(entity_id, locale)` table,
    // so a name alone is still a translation — and the slug lives there with
    // it rather than in a column of its own.
    await createBlogCategory(payload({ name: "Field Notes" }));

    expect(db.blogCategory.create).toHaveBeenCalledWith({
      data: {
        translations: {
          create: {
            locale: DEFAULT_LOCALE,
            name: "Field Notes",
            slug: "field-notes",
          },
        },
      },
    });
  });

  it("falls back to a word rather than to an empty slug", async () => {
    // A name in a script with no ASCII still needs a URL — and the fallback is
    // "category", not the blog entity's own word, because the slug stands in
    // for the noun either way.
    await createBlogCategory(payload({ name: "日本語" }));

    const [call] = db.blogCategory.create.mock.calls;
    const { slug } = (
      call[0] as { data: { translations: { create: { slug: string } } } }
    ).data.translations.create;

    expect(slug).toBe("category");
  });

  it("tries the next slug when the first one is taken", async () => {
    db.blogCategory.create
      .mockRejectedValueOnce(
        uniqueViolation(
          "BlogCategoryTranslation",
          "blog_category_translations_locale_slug_key",
        ),
      )
      .mockResolvedValueOnce({ id: "bcat_1" });

    await expect(createBlogCategory(payload())).resolves.toBe("bcat_1");

    const slugs = db.blogCategory.create.mock.calls.map(
      (call) =>
        (
          call[0] as { data: { translations: { create: { slug: string } } } }
        ).data.translations.create.slug,
    );
    expect(slugs).toEqual(["engineer", "engineer-2"]);
  });

  it("recognises a violation Prisma reported in its own shape", async () => {
    // The engine's `meta.target` rather than the adapter's cause: the retry
    // must not depend on which of the two is doing the talking.
    db.blogCategory.create
      .mockRejectedValueOnce(
        Object.assign(new Error("Unique constraint failed"), {
          code: "P2002",
          meta: { target: ["locale", "slug"] },
        }),
      )
      .mockResolvedValueOnce({ id: "bcat_1" });

    await createBlogCategory(payload());

    expect(db.blogCategory.create).toHaveBeenCalledTimes(2);
  });

  it("gives up once every slug it can think of is taken", async () => {
    // A loop against a database needs a bound, and a bound that is reached
    // needs to say so rather than return nothing.
    db.blogCategory.create.mockRejectedValue(
      uniqueViolation(
        "BlogCategoryTranslation",
        "blog_category_translations_locale_slug_key",
      ),
    );

    await expect(createBlogCategory(payload())).rejects.toBeInstanceOf(
      SlugExhaustedError,
    );
  });

  it("does not retry an error that is not a collision", async () => {
    // A database that is not running, or a query that is wrong. Retrying would
    // hide it behind a hundred attempts and then report the wrong problem.
    const failure = new Error("connection refused");
    db.blogCategory.create.mockRejectedValue(failure);

    await expect(createBlogCategory(payload())).rejects.toBe(failure);
    expect(db.blogCategory.create).toHaveBeenCalledTimes(1);
  });

  it("does not mistake a thrown non-Error for a collision", async () => {
    // `throw "boom"` and `throw null` are both legal, and reading `.code` off
    // either is how a classifier turns an odd failure into a retry loop.
    db.blogCategory.create.mockRejectedValue("boom");

    await expect(createBlogCategory(payload())).rejects.toBe("boom");
    expect(db.blogCategory.create).toHaveBeenCalledTimes(1);

    db.blogCategory.create.mockReset();
    db.blogCategory.create.mockRejectedValue(null);

    await expect(createBlogCategory(payload())).rejects.toBeNull();
    expect(db.blogCategory.create).toHaveBeenCalledTimes(1);
  });
});

describe("listBlogCategories", () => {
  it("reads them in the order they were added", async () => {
    // The timestamp first, the id as the tiebreak, because two categories saved
    // in the same millisecond would otherwise come back in whatever order
    // Postgres felt like.
    await listBlogCategories();

    expect(db.blogCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    );
  });

  it("asks only for this locale's translation", async () => {
    // The translation tables hold every language one day; the list shows one.
    await listBlogCategories();

    expect(db.blogCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { translations: { where: { locale: DEFAULT_LOCALE } } },
      }),
    );
  });

  it("reduces a row to what the list shows", async () => {
    db.blogCategory.findMany.mockResolvedValue([
      {
        id: "bcat_1",
        translations: [{ name: "Engineer", slug: "engineer" }],
      },
    ]);

    expect(await listBlogCategories()).toEqual([
      { id: "bcat_1", name: "Engineer", slug: "engineer" },
    ]);
  });

  it("survives a row with no translation in this locale", async () => {
    // Not a state this app can produce — every create writes one — but a list
    // that crashes on a hand-inserted row is worse than one with a gap in it.
    db.blogCategory.findMany.mockResolvedValue([
      { id: "bcat_1", translations: [] },
    ]);

    expect(await listBlogCategories()).toEqual([
      { id: "bcat_1", name: "", slug: "" },
    ]);
  });
});
