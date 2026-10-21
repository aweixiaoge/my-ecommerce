import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { formatDate } from "@/lib/format";
import type { BlogPostSummary } from "@/lib/blog/blog-rows";
import type { Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/languages";

/** The design's row of three, and the number the page's read asks for. */
export const JOURNAL_SIZE = 3;

/**
 * The newest posts from the blog.
 *
 * Synchronous and handed its posts, like the grid above it: the read and its
 * `<Suspense>` boundary live in the page.
 *
 * The date is `formatDate`, which formats a timestamp at UTC. The fixture this
 * replaced had its own formatter that understood a `YYYY-MM-DD` string; the
 * database sends an instant.
 */
export function Journal({
  posts,
  messages,
  locale,
}: {
  posts: readonly BlogPostSummary[];
  /** This locale's `journal` slice of the catalog. */
  messages: Messages["journal"];
  locale: Locale;
}) {
  if (posts.length === 0) return null;

  return (
    <section className="py-[72px]">
      <div className="container-content">
        <SectionHeading
          title={messages.title}
          linkLabel={messages.link}
          linkHref={localePath(locale, "/journal")}
          linkPrefetch={false}
        />

        {/*
          `sm`, not `md`: `bar` is 768 now, so a `md:` step would land on the
          same query as `bar:grid-cols-3` and the two would be decided by
          source order rather than by intent. `sm` keeps the intermediate two
          columns where they belong — below the desktop line, on the way up
          from one.
        */}
        <div className="mt-8 grid grid-cols-1 gap-12 sm:grid-cols-2 bar:grid-cols-3">
          {posts.map((post) => (
            <article key={post.id}>
              {/* A post in no category draws no label: the same gap-not-a-
                  placeholder rule the product cards follow. */}
              {post.category && (
                <p className="text-[13px] font-semibold tracking-[1.364px] uppercase leading-[21.45px] text-ink underline">
                  {post.category}
                </p>
              )}

              <h3 className="mt-[22px] text-[20px] leading-[30px] font-bold tracking-[-0.449px] text-ink">
                {/* The journal's own page does not exist yet (plan.md's
                    Content phase); the address is the one it will have, and
                    the prefetch is off because there is nothing to fetch. */}
                <Link
                  href={localePath(locale, `/journal/${post.slug}`)}
                  prefetch={false}
                >
                  {post.title}
                </Link>
              </h3>

              {post.excerpt && (
                <p className="mt-[22px] text-[15px] leading-[24.75px] tracking-[-0.234px] text-ink">
                  {post.excerpt}
                </p>
              )}

              <p className="mt-1.5 text-[13px] leading-[21.45px] tracking-[-0.076px] text-ink">
                {formatDate(post.publishedAt, locale)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** What stands in while the newest posts are being read. */
export function JournalFallback() {
  return (
    <section aria-hidden className="py-[72px]">
      <div className="container-content animate-pulse">
        <div className="h-[52.5px] w-[300px] bg-mist" />

        <div className="mt-8 grid grid-cols-1 gap-12 sm:grid-cols-2 bar:grid-cols-3">
          {Array.from({ length: JOURNAL_SIZE }, (_, index) => (
            <div key={index} className="h-[220px] bg-mist" />
          ))}
        </div>
      </div>
    </section>
  );
}
