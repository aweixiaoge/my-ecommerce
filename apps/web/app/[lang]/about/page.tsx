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
 * vocabulary instead: the FAQ page's wash and 30/45 title, and a journal
 * post's gallery — every image ahead of the words, one large and the rest as
 * thumbnails under it. The body is the product page's markdown
 * renderer, so the admin's preview is what a reader gets.
 *
 * Only the body reads the database, so only it sits behind a `<Suspense>`
 * boundary; `connection()` keeps it out of the build, as on the FAQ page.
 */
export default async function AboutPage() {
  const locale = await requestLocale();
  const messages = getMessages(locale).aboutPage;

  return (
    <section className="bg-wash py-[60px]">
      <div className="container-content">
        <h1 className="text-[30px] leading-[45px] font-bold tracking-[0.3955px] text-ink">{messages.title}</h1>

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
      <p className="pt-[40px] text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink">
        {messages.empty}{" "}
        <Link href={localePath(locale, "/contact")} className="underline underline-offset-2 hover:opacity-70">
          {messages.contact}
        </Link>
        .
      </p>
    );
  }

  return (
    <>
      {about.imageIds.length > 0 && (
        <div className="pt-[40px]">
          <ImageGallery
            images={about.imageIds.map((id) => ({ id, url: publicMediaUrl(id) }))}
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
          className="flex max-w-[790px] flex-col gap-4 pt-[40px] text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink"
        />
      )}
    </>
  );
}
