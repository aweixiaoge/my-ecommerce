import Image from "next/image";
import Link from "next/link";
import { publicMediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/format";
import type { BlogPostSummary } from "@/lib/blog/blog-rows";
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/languages";

/**
 * One post on the Journal page, set as an editorial entry rather than the
 * design's shadowed white card (Figma 178:2590): the cover leads on an ivory
 * ground, then the category as a gold eyebrow, a serif title, the excerpt in
 * grey, and the date at the foot. It is the shop card's register, so the
 * storefront reads as one magazine.
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
    <article className="group relative flex min-w-0 flex-col">
      {post.coverId && (
        <div className="relative mb-6 aspect-[4/3] w-full overflow-hidden bg-ivory">
          <Image
            src={publicMediaUrl(post.coverId)}
            // Decorative beside the title that names the post, which is the
            // card's link and what a screen reader hears.
            alt=""
            fill
            sizes="(min-width: 1338px) 410px, (min-width: 768px) 30vw, (min-width: 640px) 45vw, 100vw"
            className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
          />
        </div>
      )}

      {/* A post in no category draws no label, as on the home page. The DOM
          keeps the name as written; the capitals are CSS. */}
      {post.category && (
        <p className="pb-3 text-[11px] leading-4 font-medium tracking-[0.22em] text-gold uppercase">
          {post.category}
        </p>
      )}

      <h2 className="pb-3 font-display text-[23px] leading-[31px] font-normal [overflow-wrap:anywhere] text-ink">
        {/* The title is the link, and its `after:` box stretches over the
            whole card so the card is the click target — one link per post, so
            a screen reader hears the title once rather than a card-sized link
            reading out every line. */}
        <Link
          href={localePath(locale, `/journal/${post.slug}`)}
          className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0_1px] bg-bottom bg-no-repeat transition-[background-size] duration-500 group-hover:bg-[length:100%_1px] after:absolute after:inset-0"
        >
          {post.title}
        </Link>
      </h2>

      {post.excerpt && (
        // A margin, not padding: `line-clamp` hides overflow at the padding
        // box, so padding would leave room for a fourth line to show through.
        <p className="mb-5 line-clamp-3 text-[15px] leading-[25px] text-ink-62">{post.excerpt}</p>
      )}

      {/* `mt-auto` pins the date to the card's foot, so cards in one row that
          the grid stretches to the same height keep their dates aligned. */}
      <p className="mt-auto flex items-center gap-3 text-[11px] leading-4 tracking-[0.16em] text-ink-55 uppercase">
        <span aria-hidden className="h-px w-6 bg-gold/50" />
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
      </p>
    </article>
  );
}
