import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminCategoryCreate } from "@my-ecommerce/shared";
import { createCategory, listCategories } from "./categories-repo";
import { DEFAULT_LOCALE } from "./locale";
import { SlugExhaustedError } from "./slug";

/**
 * The repository, against a stand-in for the database — the same reasoning as
 * `products-repo.test.ts`: the unit lane has no external services, so what is
 * testable here is everything above the driver. For a category that is the
 * retry a taken slug forces, and the row the list is reduced to.
 */
const db = vi.hoisted(() => ({
  category: { create: vi.fn(), findMany: vi.fn() },
}));

vi.mock("@my-ecommerce/db", () => ({
  prisma: { category: db.category },
}));

/** A payload the shared schema would have accepted. */
function payload(
  overrides: Partial<AdminCategoryCreate> = {},
): AdminCategoryCreate {
  return { name: "Headphones", ...overrides };
}

/**
 * The shape of a unique violation as it actually arrives.
 *
 * Copied from a real one: Prisma's own `meta.target` is not what arrives when
 * a driver adapter is doing the work, which is the only reason this is written
 * out rather than inferred.
 */
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
  db.category.create.mockResolvedValue({ id: "cat_1" });
  db.category.findMany.mockResolvedValue([]);
});

describe("createCategory", () => {
  it("stores the category and returns its id", async () => {
    await expect(createCategory(payload())).resolves.toBe("cat_1");
  });

  it("writes the name and the derived slug into the locale's translation", async () => {
    // Two rows behind one field: plan.md's first decision is that text lives in
    // an `(entity_id, locale)` table, so a name alone is still a translation —
    // and the slug lives there with it rather than in a column of its own.
    await createCategory(payload({ name: "Women's Shoes" }));

    expect(db.category.create).toHaveBeenCalledWith({
      data: {
        translations: {
          create: {
            locale: DEFAULT_LOCALE,
            name: "Women's Shoes",
            slug: "women-s-shoes",
          },
        },
      },
    });
  });

  it("falls back to a word rather than to an empty slug", async () => {
    // A name in a script with no ASCII still needs a URL, and the word it falls
    // back to is this entity's — not the product one the helper defaults to.
    await createCategory(payload({ name: "日本語" }));

    const [call] = db.category.create.mock.calls;
    const { slug } = (
      call[0] as { data: { translations: { create: { slug: string } } } }
    ).data.translations.create;

    expect(slug).toBe("category");
  });

  it("tries the next slug when the first one is taken", async () => {
    // The unique constraint is the only thing that actually knows a slug is
    // taken, so the insert is what asks it — and the answer is a retry, not a
    // failure.
    db.category.create
      .mockRejectedValueOnce(
        uniqueViolation(
          "CategoryTranslation",
          "category_translations_locale_slug_key",
        ),
      )
      .mockResolvedValueOnce({ id: "cat_1" });

    await expect(createCategory(payload())).resolves.toBe("cat_1");

    const slugs = db.category.create.mock.calls.map(
      (call) =>
        (
          call[0] as { data: { translations: { create: { slug: string } } } }
        ).data.translations.create.slug,
    );
    expect(slugs).toEqual(["headphones", "headphones-2"]);
  });

  it("recognises a violation Prisma reported in its own shape", async () => {
    // The engine's `meta.target` rather than the adapter's cause: the retry
    // must not depend on which of the two is doing the talking.
    db.category.create
      .mockRejectedValueOnce(
        Object.assign(new Error("Unique constraint failed"), {
          code: "P2002",
          meta: { target: ["locale", "slug"] },
        }),
      )
      .mockResolvedValueOnce({ id: "cat_1" });

    await createCategory(payload());

    expect(db.category.create).toHaveBeenCalledTimes(2);
  });

  it("gives up once every slug it can think of is taken", async () => {
    // A loop against a database needs a bound, and a bound that is reached
    // needs to say so rather than return nothing.
    db.category.create.mockRejectedValue(
      uniqueViolation(
        "CategoryTranslation",
        "category_translations_locale_slug_key",
      ),
    );

    await expect(createCategory(payload())).rejects.toBeInstanceOf(
      SlugExhaustedError,
    );
  });

  it("does not retry an error that is not a collision", async () => {
    // A database that is not running, or a query that is wrong. Retrying would
    // hide it behind a hundred attempts and then report the wrong problem.
    const failure = new Error("connection refused");
    db.category.create.mockRejectedValue(failure);

    await expect(createCategory(payload())).rejects.toBe(failure);
    expect(db.category.create).toHaveBeenCalledTimes(1);
  });

  it("does not mistake a thrown non-Error for a collision", async () => {
    // `throw "boom"` and `throw null` are both legal, and reading `.code` off
    // either is how a classifier turns an odd failure into a retry loop.
    db.category.create.mockRejectedValue("boom");

    await expect(createCategory(payload())).rejects.toBe("boom");
    expect(db.category.create).toHaveBeenCalledTimes(1);

    db.category.create.mockReset();
    db.category.create.mockRejectedValue(null);

    await expect(createCategory(payload())).rejects.toBeNull();
    expect(db.category.create).toHaveBeenCalledTimes(1);
  });
});

describe("listCategories", () => {
  it("reads them in the order they were added", async () => {
    // Position first, for the tree that will own it; the timestamp as the
    // tiebreak, because every category this screen can make has a position of
    // zero and one key would leave the order up to the database.
    await listCategories();

    expect(db.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      }),
    );
  });

  it("asks only for this locale's translation", async () => {
    // The translation tables hold every language one day; the list shows one.
    await listCategories();

    expect(db.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { translations: { where: { locale: DEFAULT_LOCALE } } },
      }),
    );
  });

  it("reduces a row to what the list shows", async () => {
    db.category.findMany.mockResolvedValue([
      {
        id: "cat_1",
        translations: [{ name: "Headphones", slug: "headphones" }],
      },
    ]);

    expect(await listCategories()).toEqual([
      { id: "cat_1", name: "Headphones", slug: "headphones" },
    ]);
  });

  it("survives a row with no translation in this locale", async () => {
    // Not a state this app can produce — every create writes one — but a list
    // that crashes on a hand-inserted row is worse than one with a gap in it.
    db.category.findMany.mockResolvedValue([{ id: "cat_1", translations: [] }]);

    expect(await listCategories()).toEqual([{ id: "cat_1", name: "", slug: "" }]);
  });
});
