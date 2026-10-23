import { cache, Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ImageGallery } from "@/components/image-gallery";
import { JournalCard } from "@/components/journal-card";
import { MarkdownBody } from "@/components/markdown";
import { SectionHeading } from "@/components/section-heading";
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
 * The design has no frame for it, so it is made of the site's own pieces: the
 * Journal card's 13px uppercase category and date, the 30/45 page title every
 * other page uses, the Shop banner's 17px body for the excerpt as a lead, the
 * product page's markdown renderer at the product page's 790px measure, and
 * the home page's "From the journal" row — with the Journal page's cards —
 * underneath, so a reader who finishes a post has somewhere to go.
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
      <article className="container-content pt-[60px] pb-[72px]">
        <Link
          href={localePath(locale, "/journal")}
          className={`inline-flex items-center gap-2 hover:opacity-70 ${META}`}
        >
          <span aria-hidden>←</span> {messages.journalPost.back}
        </Link>

        <header className="max-w-[790px] pt-[40px]">
          {post.category && <p className={`pb-[20px] ${META}`}>{post.category}</p>}

          <h1 className="text-[30px] leading-[45px] font-bold tracking-[0.3955px] text-ink">{post.title}</h1>

          <p className={`pt-[20px] ${META}`}>
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
          </p>

          {post.excerpt && (
            <p className="pt-[24px] text-[17px] leading-[28.05px] tracking-[-0.4316px] text-ink">{post.excerpt}</p>
          )}
        </header>

        {post.imageIds.length > 0 && (
          <div className="pt-[40px]">
            <ImageGallery
              images={post.imageIds.map((id) => ({ id, url: publicMediaUrl(id) }))}
              title={post.title}
              messages={messages.gallery}
            />
          </div>
        )}

        {blocks.length > 0 && (
          <MarkdownBody
            blocks={blocks}
            className="flex max-w-[790px] flex-col gap-4 pt-[40px] text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink"
          />
        )}

      </article>

      {others.length > 0 && (
        <section className="bg-wash py-[72px]">
          <div className="container-content">
            <SectionHeading
              title={messages.journal.title}
              linkLabel={messages.journal.link}
              linkHref={localePath(locale, "/journal")}
            />

            <div className="mt-8 grid grid-cols-1 gap-[30px] sm:grid-cols-2 bar:grid-cols-3">
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

const META = "text-[13px] leading-[21.45px] font-semibold tracking-[-0.076px] text-ink uppercase";

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
    <div aria-hidden className="container-content animate-pulse pt-[60px] pb-[72px]">
      <div className="h-[21px] w-[160px] bg-mist" />
      <div className="mt-[40px] h-[45px] w-full max-w-[600px] bg-mist" />
      <div className="mt-[20px] h-[21px] w-[140px] bg-mist" />
      <div className="mt-[40px] aspect-[4/3] w-full bg-mist bar:aspect-[1290/640]" />
    </div>
  );
}
