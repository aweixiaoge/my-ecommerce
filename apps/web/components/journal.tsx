import Image from "next/image";
import Link from "next/link";
import { EditorialHeading } from "@/components/section-heading";
import { formatDate } from "@/lib/format";
import type { BlogPostSummary } from "@/lib/blog/blog-rows";
import { publicMediaUrl } from "@/lib/media";
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
    <section className="border-t border-line py-[96px]">
      <div className="container-content">
        <EditorialHeading
          title={messages.title}
          linkLabel={messages.link}
          linkHref={localePath(locale, "/journal")}
        />

        {/*
          `sm`, not `md`: `bar` is 768 now, so a `md:` step would land on the
          same query as `bar:grid-cols-3` and the two would be decided by
          source order rather than by intent. `sm` keeps the intermediate two
          columns where they belong — below the desktop line, on the way up
          from one.
        */}
        <div className="mt-12 grid grid-cols-1 gap-x-[30px] gap-y-12 sm:grid-cols-2 bar:grid-cols-3">
          {posts.map((post) => (
            <article key={post.id} className="group flex min-w-0 flex-col">
              {/* The cover links to the post too, but stays out of the tab
                  order and the reading: the title below is the one link a
                  keyboard or a screen reader needs. */}
              {post.coverId && (
                <Link
                  href={localePath(locale, `/journal/${post.slug}`)}
                  tabIndex={-1}
                  aria-hidden
                  className="relative mb-6 block aspect-[4/3] w-full overflow-hidden bg-ivory"
                >
                  <Image
                    src={publicMediaUrl(post.coverId)}
                    alt=""
                    fill
                    sizes="(min-width: 1338px) 400px, (min-width: 768px) 30vw, (min-width: 640px) 45vw, 100vw"
                    className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
                  />
                </Link>
              )}

              {/* A post in no category draws no label: the same gap-not-a-
                  placeholder rule the product cards follow. The DOM keeps the
                  name as the admin wrote it; the capitals are CSS. */}
              {post.category && (
                <p className="pb-3 text-[11px] leading-4 font-medium tracking-[0.22em] text-gold uppercase">
                  {post.category}
                </p>
              )}

              <h3 className="font-display text-[23px] leading-[31px] font-normal [overflow-wrap:anywhere] text-ink">
                <Link
                  href={localePath(locale, `/journal/${post.slug}`)}
                  className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0_1px] bg-bottom bg-no-repeat transition-[background-size] duration-500 group-hover:bg-[length:100%_1px]"
                >
                  {post.title}
                </Link>
              </h3>

              {post.excerpt && (
                <p className="mt-3 line-clamp-3 text-[15px] leading-[25px] text-ink-62">
                  {post.excerpt}
                </p>
              )}

              <p className="mt-auto flex items-center gap-3 pt-5 text-[11px] leading-4 tracking-[0.16em] text-ink-55 uppercase">
                <span aria-hidden className="h-px w-6 bg-gold/50" />
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
    <section aria-hidden className="border-t border-line py-[96px]">
      <div className="container-content animate-pulse">
        <div className="mx-auto h-[108px] w-[300px] bg-mist" />

        <div className="mt-12 grid grid-cols-1 gap-x-[30px] gap-y-12 sm:grid-cols-2 bar:grid-cols-3">
          {Array.from({ length: JOURNAL_SIZE }, (_, index) => (
            <div key={index} className="h-[220px] bg-mist" />
          ))}
        </div>
      </div>
    </section>
  );
}
