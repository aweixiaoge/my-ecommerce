import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ImageGallery } from "@/components/image-gallery";
import { MarkdownBody } from "@/components/markdown";
import { publicMediaUrl } from "@/lib/catalog/media-repo";
import { getAboutPage } from "@/lib/contact/about-repo";
import { getMessages, type Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import { requestLocale } from "@/lib/i18n/request";
import type { Locale } from "@/lib/languages";
import { parseMarkdown } from "@/lib/markdown";

export async function generateMetadata(): Promise<Metadata> {
  const messages = getMessages(await requestLocale());

  return { title: messages.aboutPage.title, description: messages.aboutPage.description };
}

/**
 * The About page: the images and the description the admin sets under
 * Contact → About, the words in the reader's language or, where they have not
 * been translated, in English.
 *
 * The Figma file's `about-us-page` frame (159:1325) is another brand's
 * template — its own header, footer and type, and stat and hiring blocks the
 * admin has no fields for — so the page is drawn in the storefront's own
 * vocabulary instead, in its luxury register: the centred serif masthead the
 * Journal and Contact pages open with, a journal post's gallery — every image
 * ahead of the words, one large and the rest as thumbnails under it — and the
 * body at a journal post's reading measure, in its serif headings. The body is
 * the product page's markdown renderer, so the admin's preview is what a
 * reader gets.
 *
 * Only the body reads the database, so only it sits behind a `<Suspense>`
 * boundary; `connection()` keeps it out of the build, as on the FAQ page.
 */
export default async function AboutPage() {
  const locale = await requestLocale();
  const messages = getMessages(locale).aboutPage;

  return (
    <section className="pt-[72px] pb-[96px]">
      <div className="container-content">
        <header className="mx-auto max-w-[620px] text-center">
          <h1 className="font-display text-[40px] leading-[48px] font-normal text-ink sm:text-[48px] sm:leading-[56px]">
            {messages.title}
          </h1>
          <div aria-hidden className="mx-auto mt-5 h-px w-8 bg-gold/50" />
        </header>

        <Suspense fallback={null}>
          <AboutBody locale={locale} messages={messages} galleryMessages={getMessages(locale).gallery} />
        </Suspense>
      </div>
    </section>
  );
}

async function AboutBody({
  locale,
  messages,
  galleryMessages,
}: {
  locale: Locale;
  messages: Messages["aboutPage"];
  galleryMessages: Messages["gallery"];
}) {
  await connection();

  const about = await getAboutPage(locale);
  const blocks = parseMarkdown(about.description);

  if (blocks.length === 0 && about.imageIds.length === 0) {
    return (
      <p className="pt-[56px] mx-auto max-w-[620px] text-center font-display text-[18px] leading-7 text-ink-55 italic">
        {messages.empty}{" "}
        <Link href={localePath(locale, "/contact")} className="text-ink not-italic underline decoration-gold underline-offset-4 hover:decoration-ink">
          {messages.contact}
        </Link>
        .
      </p>
    );
  }

  return (
    <>
      {about.imageIds.length > 0 && (
        <div className="pt-[56px]">
          <ImageGallery
            images={about.imageIds.map((id) => ({
              id,
              url: publicMediaUrl(id),
              kind: about.videoIds.includes(id) ? "video" : "image",
            }))}
            // The admin collects no alt text for these; the page's title is
            // what a reader would say they are of.
            title={messages.title}
            messages={galleryMessages}
          />
        </div>
      )}

      {blocks.length > 0 && (
        <MarkdownBody
          blocks={blocks}
          className="mx-auto flex max-w-[680px] flex-col gap-6 pt-[56px] text-[17px] leading-[30px] text-ink-62 [&_strong]:font-medium [&_strong]:text-ink [&_:is(h2,h3,h4)]:pt-4 [&_:is(h2,h3,h4)]:font-display [&_:is(h2,h3,h4)]:font-normal [&_:is(h2,h3,h4)]:text-ink [&_h2]:text-[26px] [&_h2]:leading-9 [&_h3]:text-[21px] [&_h3]:leading-8"
        />
      )}
    </>
  );
}
