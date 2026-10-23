import Image from "next/image";
import Link from "next/link";
import { publicMediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/format";
import type { BlogPostSummary } from "@/lib/blog/blog-rows";
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/languages";

/**
 * One post on the Journal page (Figma 178:2590): a white card with 30px of
 * padding and the design's soft drop shadow, holding the category, the title,
 * the excerpt and the date — with the post's cover under the category, which
 * the design does not draw but a wall of text-only cards needed.
 *
 * The design's byline reads "ADMIN / OCTOBER 12, 2026". Posts have no author —
 * nothing in the admin records one — so the card shows the date alone rather
 * than a name nobody wrote down.
 *
 * Not the home page's journal column: that one sits on the page with no card
 * around it and underlines its category, and the two frames disagree.
 */
export function JournalCard({ post, locale }: { post: BlogPostSummary; locale: Locale }) {
  return (
    <article className="group relative flex flex-col bg-paper p-[30px] shadow-[0_12px_18px_-6px_#2238650a] transition-shadow hover:shadow-[0_16px_28px_-8px_#22386524]">
      {/* A post in no category draws no label, as on the home page. The
          design's label row is 41.4px: the 21.45px line and the air under it. */}
      {post.category && (
        <p className={`pb-[20px] ${META}`}>{post.category}</p>
      )}

      {post.coverId && (
        <div className="relative mb-[24px] aspect-[3/2] w-full overflow-hidden bg-mist">
          <Image
            src={publicMediaUrl(post.coverId)}
            // Decorative beside the title that names the post, which is the
            // card's link and what a screen reader hears.
            alt=""
            fill
            sizes="(min-width: 1338px) 370px, (min-width: 768px) 30vw, (min-width: 640px) 45vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        </div>
      )}

      <h2 className="pb-[20px] text-[20px] leading-[26px] font-bold tracking-[-0.449px] text-ink">
        {/* The title is the link, and its `after:` box stretches over the
            whole card so the card is the click target — one link per post, so
            a screen reader hears the title once rather than a card-sized link
            reading out every line. */}
        <Link
          href={localePath(locale, `/journal/${post.slug}`)}
          className="after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-2"
        >
          {post.title}
        </Link>
      </h2>

      {post.excerpt && (
        <p className="pb-[20px] text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink">{post.excerpt}</p>
      )}

      {/* `mt-auto` pins the date to the card's foot, so cards in one row that
          the grid stretches to the same height keep their dates aligned. */}
      <p className={`mt-auto ${META}`}>
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
      </p>
    </article>
  );
}

/** The label and the date: set as written — "Engineer", "October 16, 2026" — not in capitals. */
const META = "text-[13px] leading-[21.45px] font-semibold tracking-[-0.076px] text-ink";
