import { describe, expect, it } from "vitest";
import { toBlogPost, type BlogRow } from "./blog-rows";

/**
 * What a journal card is made of, with no database anywhere near it.
 *
 * Three of the fields are the translation's, one is the row's, and one is the
 * category's — and the category is the only one allowed to be missing.
 */
function row(overrides: Partial<BlogRow> = {}): BlogRow {
  return {
    id: "blog_1",
    createdAt: new Date("2026-10-15T17:41:12.326Z"),
    translations: [
      {
        title: "How to judge earphone sound quality",
        slug: "how-to-judge-earphone-sound-quality",
        shortDescription: "Bass, treble and soundstage, explained without the jargon.",
      },
    ],
    category: { translations: [{ name: "Engineer" }] },
    ...overrides,
  } as BlogRow;
}

describe("toBlogPost", () => {
  it("draws the label, the title, the excerpt and the date", () => {
    expect(toBlogPost(row())).toEqual({
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
    expect(toBlogPost(row({ category: null }))?.category).toBe("");

    // A category is one thing per locale, so a category with no translation
    // here is the same absence.
    expect(toBlogPost(row({ category: { translations: [] } }))?.category).toBe("");
  });

  it("has no card for a post with nothing written in this locale", () => {
    // Reachable: the translation is *selected* per locale rather than filtered,
    // so a post whose English row was deleted still arrives — with no title and
    // no slug, which is a card whose link leads nowhere.
    expect(toBlogPost(row({ translations: [] }))).toBeNull();
  });
});
