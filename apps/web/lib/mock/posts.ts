/**
 * Mock journal posts.
 *
 * Blog is not in `@my-ecommerce/shared` yet — the type below is local and
 * deliberately shaped like the API's listing view so it can move into the
 * shared contract when the blog feature is built, rather than being rewritten.
 */
export type PostSummary = {
  id: string;
  slug: string;
  /** Category label, uppercase in the design. */
  category: string;
  title: string;
  excerpt: string;
  /** ISO 8601 — formatted for display at the edge, never stored preformatted. */
  publishedAt: string;
};

const posts: PostSummary[] = [
  {
    id: "post_sound_quality",
    slug: "how-to-judge-earphone-sound-quality",
    category: "Engineer",
    title:
      "How to Judge Earphone Sound Quality: Bass, Treble & Soundstage Explained",
    excerpt:
      "“Great sound quality” is thrown around in every product description — but what does it actually mean? And how can you judge it without being an audio engineer? This guide explains the core concepts in plain English, so you can evaluate earphones with confidence. The Basics: Frequency Response Every sound you hear is a frequency,…",
    publishedAt: "2026-10-12",
  },
  {
    id: "post_earphone_types",
    slug: "in-ear-vs-on-ear-vs-over-ear",
    category: "Design",
    title: "In-Ear vs On-Ear vs Over-Ear: Which Earphone Type Is Right for You?",
    excerpt:
      "Walk into any electronics store and you’ll see three main types of earphones: in-ear, on-ear, and over-ear. Each looks different, feels different, and sounds different. But which one is actually right for you? The answer depends on how you’ll use them, where you’ll use them, and what you value most — portability, sound quality, comfort,…",
    publishedAt: "2026-10-12",
  },
];

export async function getPosts(): Promise<PostSummary[]> {
  return posts;
}

export function formatPostDate(iso: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}
