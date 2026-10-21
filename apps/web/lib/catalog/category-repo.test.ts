import { beforeEach, describe, expect, it, vi } from "vitest";
import { foreignCategoryPath, getCategoryBySlug } from "./category-repo";

/**
 * The category read, against a stand-in for the database.
 *
 * The lane has no external services (`.claude/tdd-guardian/config.json`), so
 * what is worth asserting is the shape of the query — which locales it means,
 * which columns it refuses to read — and what a row becomes on the page.
 */
const db = vi.hoisted(() => ({ category: { findFirst: vi.fn() } }));

vi.mock("@my-ecommerce/db", () => ({ prisma: { category: db.category } }));

/** A row as `categorySelect` returns one. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "cat_earbuds",
    translations: [
      {
        locale: "en",
        slug: "earbuds",
        name: "Earbuds",
        description: "Everything that goes in your ears.",
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.category.findFirst.mockResolvedValue(null);
});

describe("getCategoryBySlug", () => {
  it("looks the slug up through the translation, in either language", async () => {
    // The slug lives in the translation table and is unique within a locale, so
    // the lookup has to say which locale it means — and both are answers,
    // because a category nobody has translated is still a category with
    // products in it.
    db.category.findFirst.mockResolvedValue(row());

    const category = await getCategoryBySlug("earbuds", "de");

    expect(db.category.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          translations: { some: { slug: "earbuds", locale: { in: ["de", "en"] } } },
        },
      }),
    );
    // Shown in the default language, because that is the only row there is.
    expect(category).toEqual({
      id: "cat_earbuds",
      slug: "earbuds",
      name: "Earbuds",
      description: "Everything that goes in your ears.",
    });
  });

  it("prefers the translation when the category has one", async () => {
    db.category.findFirst.mockResolvedValue(
      row({
        translations: [
          {
            locale: "de",
            slug: "ohrstoepsel",
            name: "Ohrstöpsel",
            description: "Alles, was ins Ohr geht.",
          },
          {
            locale: "en",
            slug: "earbuds",
            name: "Earbuds",
            description: "Everything that goes in your ears.",
          },
        ],
      }),
    );

    // Either language addresses the row; the language of the page decides what
    // it says — and the slug it says it at is the one the page links with.
    expect(await getCategoryBySlug("ohrstoepsel", "de")).toMatchObject({
      name: "Ohrstöpsel",
      slug: "ohrstoepsel",
    });
    expect(await getCategoryBySlug("earbuds", "de")).toMatchObject({
      name: "Ohrstöpsel",
      slug: "ohrstoepsel",
    });
  });

  it("asks only for the columns the page reads", async () => {
    await getCategoryBySlug("earbuds", "en");

    const [args] = db.category.findFirst.mock.calls[0] as [
      { select: { translations: { select: Record<string, boolean> } } },
    ];
    expect(Object.keys(args.select.translations.select)).toEqual([
      "slug",
      "name",
      "description",
      "locale",
    ]);
  });

  it("answers null for a slug that names nothing", async () => {
    expect(await getCategoryBySlug("nope", "en")).toBeNull();
  });

  it("answers null for a row with no translation in either language", async () => {
    // Reachable despite the query's `some` filter: that chooses which rows come
    // back, not which translations, so a category whose rows were both deleted
    // still arrives — with nothing to render.
    db.category.findFirst.mockResolvedValue(row({ translations: [] }));

    expect(await getCategoryBySlug("earbuds", "en")).toBeNull();
  });
});

describe("foreignCategoryPath", () => {
  it("finds a category by a slug from another language, and answers with this language's address", async () => {
    // `/fr` reached from `/de/products/kopfhorer` holds a German slug, which
    // the lookup above — French, then English — answers null for. The category
    // exists; the French address is where it lives.
    db.category.findFirst.mockResolvedValue(
      row({
        translations: [
          {
            locale: "fr",
            slug: "casques",
            name: "Casques",
            description: "",
          },
        ],
      }),
    );

    expect(await foreignCategoryPath("kopfhorer", "fr")).toBe(
      "/fr/products/casques",
    );

    // Any language's slug, and no locale filter: the fallback set has already
    // been asked and said no.
    expect(db.category.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { translations: { some: { slug: "kopfhorer" } } },
      }),
    );
  });

  it("answers null for a slug no language knows", async () => {
    expect(await foreignCategoryPath("nope", "fr")).toBeNull();
  });

  it("answers null for a row with no translation in this page's languages", async () => {
    db.category.findFirst.mockResolvedValue(row({ translations: [] }));

    expect(await foreignCategoryPath("kopfhorer", "fr")).toBeNull();
  });
});
