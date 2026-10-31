import { cache, Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ImageGallery } from "@/components/image-gallery";
import { JournalCard } from "@/components/journal-card";
import { MarkdownBody } from "@/components/markdown";
import { EditorialHeading } from "@/components/section-heading";
import { foreignBlogPostSlug, getBlogPostBySlug, listOtherBlogPosts } from "@/lib/blog/blog-repo";
import { publicMediaUrl } from "@/lib/catalog/media-repo";
import { formatDate } from "@/lib/format";
import { getMessages, type Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import { requestLocale } from "@/lib/i18n/request";
import type { Locale } from "@/lib/languages";
import { parseMarkdown } from "@/lib/markdown";

/**
 * One journal post at `/journal/<slug>`.
 *
 * The design has no frame for it, so it is set in the storefront's luxury
 * register: a centred header — the category as a gold eyebrow, a large serif
 * title, the short gold rule, the date, and the excerpt as an italic serif
 * standfirst — then the gallery, the body at a 680px reading measure, and a
 * "From the journal" row of the Journal page's cards underneath, so a reader
 * who finishes a post has somewhere to go.
 *
 * Shaped like the product route for the same reasons: `params` is read inside
 * `<Suspense>` so the chrome prerenders, there is no `generateStaticParams`
 * because slugs are rows, and a slug that is not this language's is moved to
 * the one that is.
 */

/** One read per request — the metadata and the page ask for the same post. */
const loadPost = cache(getBlogPostBySlug);

/** Posts in the "keep reading" row: the design's row of three. */
const MORE_POSTS = 3;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, requestLocale()]);
  const post = await loadPost(decodeSlug(slug), locale);

  return post ? { title: post.metaTitle, description: post.metaDescription || undefined } : {};
}

export default function JournalPostRoute(props: PageProps<"/[lang]/journal/[slug]">) {
  return (
    <Suspense fallback={<JournalPostFallback />}>
      {props.params.then(async ({ slug }) => {
        const locale = await requestLocale();

        return <JournalPost slug={decodeSlug(slug)} locale={locale} messages={getMessages(locale)} />;
      })}
    </Suspense>
  );
}

async function JournalPost({ slug, locale, messages }: { slug: string; locale: Locale; messages: Messages }) {
  const post = await loadPost(slug, locale);

  if (!post) {
    // Another language's slug — what the language switcher carries across —
    // is this post under another name: send the reader to its name here.
    const elsewhere = await foreignBlogPostSlug(slug, locale);
    if (elsewhere) permanentRedirect(localePath(locale, `/journal/${elsewhere}`));

    notFound();
  }

  // Reached by its English slug on a page whose language has its own: one
  // post, one address per language.
  if (post.slug !== slug) permanentRedirect(localePath(locale, `/journal/${post.slug}`));

  const blocks = parseMarkdown(post.description);
  const others = await listOtherBlogPosts(post.id, MORE_POSTS, locale);

  return (
    <>
      <article className="container-content pt-[48px] pb-[96px]">
        <Link
          href={localePath(locale, "/journal")}
          className="inline-flex items-center gap-2 text-[11px] leading-4 tracking-[0.18em] text-ink-55 uppercase transition-colors hover:text-ink"
        >
          <span aria-hidden>←</span> {messages.journalPost.back}
        </Link>

        <header className="mx-auto max-w-[760px] pt-[48px] text-center">
          {post.category && (
            <p className="pb-4 text-[11px] leading-4 font-medium tracking-[0.22em] text-gold uppercase">
              {post.category}
            </p>
          )}

          <h1 className="font-display text-[36px] leading-[44px] font-normal [overflow-wrap:anywhere] text-ink sm:text-[48px] sm:leading-[58px]">
            {post.title}
          </h1>

          <div aria-hidden className="mx-auto mt-6 h-px w-8 bg-gold/50" />

          <p className="pt-5 text-[11px] leading-4 tracking-[0.16em] text-ink-55 uppercase">
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
          </p>

          {post.excerpt && (
            <p className="pt-8 font-display text-[20px] leading-[32px] text-ink-62 italic">{post.excerpt}</p>
          )}
        </header>

        {post.imageIds.length > 0 && (
          <div className="pt-[56px]">
            <ImageGallery
              images={post.imageIds.map((id) => ({
                id,
                url: publicMediaUrl(id),
                kind: post.videoIds.includes(id) ? "video" : "image",
              }))}
              title={post.title}
              messages={messages.gallery}
            />
          </div>
        )}

        {blocks.length > 0 && (
          <MarkdownBody
            blocks={blocks}
            // Headings in the serif, set here rather than in `MarkdownBody`,
            // which the product, about and FAQ pages share.
            className="mx-auto flex max-w-[680px] flex-col gap-6 pt-[56px] text-[17px] leading-[30px] text-ink-62 [&_strong]:font-medium [&_strong]:text-ink [&_:is(h2,h3,h4)]:pt-4 [&_:is(h2,h3,h4)]:font-display [&_:is(h2,h3,h4)]:font-normal [&_:is(h2,h3,h4)]:text-ink [&_h2]:text-[26px] [&_h2]:leading-9 [&_h3]:text-[21px] [&_h3]:leading-8"
          />
        )}
      </article>

      {others.length > 0 && (
        <section className="border-t border-line bg-wash py-[88px]">
          <div className="container-content">
            <EditorialHeading
              title={messages.journal.title}
              linkLabel={messages.journal.link}
              linkHref={localePath(locale, "/journal")}
            />

            <div className="mt-[48px] grid grid-cols-1 gap-x-[30px] gap-y-[56px] sm:grid-cols-2 bar:grid-cols-3">
              {others.map((other) => (
                <JournalCard key={other.id} post={other} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/**
 * The slug as the post was saved with it. Next hands a segment over still
 * percent-encoded when it holds anything outside ASCII, and a translated slug
 * can; a malformed escape is left as it came and simply finds no post.
 */
function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function JournalPostFallback() {
  return (
    <div aria-hidden className="container-content animate-pulse pt-[48px] pb-[96px]">
      <div className="h-4 w-[160px] bg-mist" />
      <div className="mx-auto mt-[64px] h-[58px] w-full max-w-[600px] bg-mist" />
      <div className="mx-auto mt-[44px] h-4 w-[140px] bg-mist" />
      <div className="mt-[56px] aspect-[4/3] w-full bg-mist bar:aspect-[1290/640]" />
    </div>
  );
}
