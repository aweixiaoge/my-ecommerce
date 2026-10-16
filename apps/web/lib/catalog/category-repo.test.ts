import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCategoryBySlug } from "./category-repo";

/**
 * The category read, against a stand-in for the database.
 *
 * The lane has no external services (`.claude/tdd-guardian/config.json`), so
 * what is worth asserting is the shape of the query — which locale it means,
 * which columns it refuses to read — and what a row becomes on the page.
 */
const db = vi.hoisted(() => ({ category: { findFirst: vi.fn() } }));

vi.mock("@my-ecommerce/db", () => ({ prisma: { category: db.category } }));

/** A row as `CATEGORY_SELECT` returns one. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "cat_earbuds",
    translations: [
      {
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
  it("looks the slug up through the translation, for one locale", async () => {
    // The slug lives in the translation table and is unique within a locale, so
    // the lookup has to say which locale it means — and a German slug is not
    // the English page.
    db.category.findFirst.mockResolvedValue(row());

    const category = await getCategoryBySlug("earbuds");

    expect(db.category.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { translations: { some: { locale: "en", slug: "earbuds" } } },
      }),
    );
    expect(category).toEqual({
      id: "cat_earbuds",
      slug: "earbuds",
      name: "Earbuds",
      description: "Everything that goes in your ears.",
    });
  });

  it("asks only for the columns the page reads", async () => {
    await getCategoryBySlug("earbuds");

    const [args] = db.category.findFirst.mock.calls[0] as [
      { select: { translations: { select: Record<string, boolean> } } },
    ];
    expect(Object.keys(args.select.translations.select)).toEqual([
      "slug",
      "name",
      "description",
    ]);
  });

  it("answers null for a slug that names nothing", async () => {
    expect(await getCategoryBySlug("nope")).toBeNull();
  });

  it("answers null for a row with no translation in this locale", async () => {
    // Reachable despite the query's `some` filter: that chooses which rows come
    // back, not which translations, so a category whose English row was deleted
    // still arrives — with nothing to render.
    db.category.findFirst.mockResolvedValue(row({ translations: [] }));

    expect(await getCategoryBySlug("earbuds")).toBeNull();
  });
});
