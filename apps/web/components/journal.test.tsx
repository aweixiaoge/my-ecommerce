import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { BlogPostSummary } from "@/lib/blog/blog-rows";
import { en } from "@/lib/i18n/messages/en";
import { Journal, JournalFallback, JOURNAL_SIZE } from "./journal";

/**
 * The home page's journal row, asserted through its markup.
 *
 * The posts are a fixture: what the database hands over is
 * `lib/blog/blog-repo.test.ts`'s business. What is this component's is the card
 * — label, title, excerpt, date — and the two fields a post is allowed to be
 * without.
 */
const post = (overrides: Partial<BlogPostSummary> = {}): BlogPostSummary => ({
  id: "blog_1",
  slug: "how-to-judge-earphone-sound-quality",
  title: "How to judge earphone sound quality",
  excerpt: "Bass, treble and soundstage, explained without the jargon.",
  category: "Engineer",
  publishedAt: "2026-10-15T17:41:12.326Z",
  ...overrides,
});

const render = (posts: BlogPostSummary[]) =>
  renderToStaticMarkup(
    <Journal posts={posts} messages={en.journal} locale="en" />,
  );

describe("Journal", () => {
  it("frames the row with its heading and the way to the rest of it", () => {
    const markup = render([post()]);

    expect(markup).toContain("From the journal");
    expect(markup).toContain("All articles →");
    // The language leads every address, so English's journal is `/en/journal`.
    expect(markup).toContain('href="/en/journal"');
  });

  it("draws a post's label, title, excerpt and date", () => {
    const markup = render([post()]);

    expect(markup).toContain("Engineer");
    expect(markup).toContain("How to judge earphone sound quality");
    expect(markup).toContain("Bass, treble and soundstage, explained without the jargon.");
    // The instant the row was created, formatted at UTC — not the date-only
    // string the retired fixture used to hold.
    expect(markup).toContain("October 15, 2026");
  });

  it("links each title at the post's own address", () => {
    const markup = render([post()]);

    expect(markup).toContain(
      'href="/en/journal/how-to-judge-earphone-sound-quality"',
    );
  });

  it("draws one post per item, in the order it was given", () => {
    const markup = render([
      post(),
      post({ id: "blog_2", slug: "this-is-the-first-blog", title: "This is the first blog" }),
      post({ id: "blog_3", slug: "third", title: "Third" }),
    ]);

    expect(markup.match(/<article/g)).toHaveLength(3);
    expect(markup.indexOf("How to judge")).toBeLessThan(
      markup.indexOf("This is the first blog"),
    );
  });

  it("draws no label for a post in no category", () => {
    const markup = render([post({ category: "" })]);

    expect(markup).toContain("How to judge earphone sound quality");
    // The underlined label is the only thing that would have carried it.
    expect(markup).not.toContain("uppercase");
  });

  it("draws no excerpt for a post that has none", () => {
    const markup = render([post({ excerpt: "" })]);

    expect(markup).toContain("How to judge earphone sound quality");
    expect(markup).not.toContain("Bass, treble and soundstage");
  });

  it("draws nothing at all when there are no posts", () => {
    expect(render([])).toBe("");
  });
});

describe("JournalFallback", () => {
  it("holds the row's place, with nothing to announce", () => {
    const markup = renderToStaticMarkup(<JournalFallback />);

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("<h2");
    expect(markup.match(/bg-mist/g)).toHaveLength(JOURNAL_SIZE + 1);
  });
});
