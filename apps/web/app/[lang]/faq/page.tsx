import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { MarkdownBody } from "@/components/markdown";
import { getFaqDescription } from "@/lib/contact/faq-repo";
import { getMessages, type Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import { requestLocale } from "@/lib/i18n/request";
import type { Locale } from "@/lib/languages";
import { parseMarkdown } from "@/lib/markdown";

export async function generateMetadata(): Promise<Metadata> {
  const messages = getMessages(await requestLocale());

  return { title: messages.faqPage.title, description: messages.faqPage.description };
}

/**
 * The FAQ page: a title over the description the admin writes under
 * Contact → FAQ, in the reader's language or, where it has not been
 * translated, in English.
 *
 * Drawn as the Contact page is (Figma 178:7601) — the same wash, the same 30/45
 * title, the same 16/26.4 body — since the design has no FAQ frame of its own.
 * The body is the product page's markdown renderer at the product page's
 * measure, so the admin's preview is what a reader gets.
 *
 * Only the body reads the database, so only it sits behind a `<Suspense>`
 * boundary; `connection()` keeps it out of the build, as on the home page.
 */
export default async function FaqPage() {
  const locale = await requestLocale();
  const messages = getMessages(locale).faqPage;

  return (
    <section className="bg-wash py-[60px]">
      <div className="container-content">
        <h1 className="text-[30px] leading-[45px] font-bold tracking-[0.3955px] text-ink">{messages.title}</h1>

        <div className="pt-[40px]">
          <Suspense fallback={null}>
            <FaqBody locale={locale} messages={messages} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}

async function FaqBody({ locale, messages }: { locale: Locale; messages: Messages["faqPage"] }) {
  await connection();

  const blocks = parseMarkdown(await getFaqDescription(locale));

  if (blocks.length === 0) {
    return (
      <p className="text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink">
        {messages.empty}{" "}
        <Link href={localePath(locale, "/contact")} className="underline underline-offset-2 hover:opacity-70">
          {messages.askUs}
        </Link>
        .
      </p>
    );
  }

  return (
    <MarkdownBody
      blocks={blocks}
      className="flex max-w-[790px] flex-col gap-4 text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink"
    />
  );
}
