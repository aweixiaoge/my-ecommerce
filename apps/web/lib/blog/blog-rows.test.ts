import { describe, expect, it } from "vitest";
import { toBlogPost, type BlogRow } from "./blog-rows";

/**
 * What a journal card is made of, with no database anywhere near it.
 *
 * Three of the fields are the translation's, one is the row's, and one is the
 * category's — and the category is the only one allowed to be missing.
 *
 * The rows here carry the language of every translation, because that is what
 * chooses between them: the query fetches the requested language and the
 * default, and the mapper prefers the first.
 */
function row(overrides: Partial<BlogRow> = {}): BlogRow {
  return {
    id: "blog_1",
    createdAt: new Date("2026-10-15T17:41:12.326Z"),
    translations: [
      {
        locale: "en",
        title: "How to judge earphone sound quality",
        slug: "how-to-judge-earphone-sound-quality",
        shortDescription: "Bass, treble and soundstage, explained without the jargon.",
      },
    ],
    category: { translations: [{ locale: "en", name: "Engineer" }] },
    ...overrides,
  } as BlogRow;
}

describe("toBlogPost", () => {
  it("draws the label, the title, the excerpt and the date", () => {
    expect(toBlogPost(row(), "en")).toEqual({
      id: "blog_1",
      slug: "how-to-judge-earphone-sound-quality",
      title: "How to judge earphone sound quality",
      excerpt: "Bass, treble and soundstage, explained without the jargon.",
      category: "Engineer",
      publishedAt: "2026-10-15T17:41:12.326Z",
    });
  });

  it("leaves the label empty for a post in no category", () => {
    // No placeholder: the card draws nothing where the label would be, the same
    // way a product card with no category does.
    expect(toBlogPost(row({ category: null }), "en")?.category).toBe("");

    // A category is one thing per locale, so a category with no translation
    // in either is the same absence.
    expect(
      toBlogPost(row({ category: { translations: [] } }), "en")?.category,
    ).toBe("");
  });

  it("has no card for a post with nothing written in either language", () => {
    // Reachable: the translation is *selected* per locale rather than filtered,
    // so a post whose rows were both deleted still arrives — with no title and
    // no slug, which is a card whose link leads nowhere.
    expect(toBlogPost(row({ translations: [] }), "en")).toBeNull();
  });

  it("shows the default language's post when there is no translation", () => {
    // The fallback rule, and the state every post is in until somebody
    // translates it: a German page shows the English post, at the English slug,
    // rather than dropping it out of the journal.
    const german = toBlogPost(row(), "de");

    expect(german?.title).toBe("How to judge earphone sound quality");
    expect(german?.slug).toBe("how-to-judge-earphone-sound-quality");
    expect(german?.category).toBe("Engineer");
  });

  it("prefers the translation, slug and category label included", () => {
    const translated = row({
      translations: [
        {
          locale: "de",
          title: "Klangqualität von Ohrhörern beurteilen",
          slug: "klangqualitaet-von-ohrhoerern-beurteilen",
          shortDescription: "Bass, Höhen und Bühne, ohne Fachjargon erklärt.",
        },
        {
          locale: "en",
          title: "How to judge earphone sound quality",
          slug: "how-to-judge-earphone-sound-quality",
          shortDescription: "Bass, treble and soundstage, explained without the jargon.",
        },
      ],
      category: {
        translations: [
          { locale: "de", name: "Technik" },
          { locale: "en", name: "Engineer" },
        ],
      },
    } as Partial<BlogRow>);

    expect(toBlogPost(translated, "de")).toMatchObject({
      title: "Klangqualität von Ohrhörern beurteilen",
      slug: "klangqualitaet-von-ohrhoerern-beurteilen",
      category: "Technik",
    });

    // The same row read in English is the English post: one row, two addresses.
    expect(toBlogPost(translated, "en")).toMatchObject({
      title: "How to judge earphone sound quality",
      category: "Engineer",
    });
  });

  it("falls back per field, not per row", () => {
    // A translated post whose *category* was never translated keeps the English
    // label — the two are separate rows and neither waits for the other.
    const post = row({
      translations: [
        {
          locale: "de",
          title: "Kabellose Ohrhörer im Test",
          slug: "kabellose-ohrhoerer-im-test",
          shortDescription: "Sieben Tage, ein Paar, kein Ladegerät.",
        },
      ],
    } as Partial<BlogRow>);

    expect(toBlogPost(post, "de")?.category).toBe("Engineer");
  });
});
