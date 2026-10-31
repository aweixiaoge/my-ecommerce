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
 * Drawn as the Contact page is, since the design has no FAQ frame of its own:
 * the centred serif masthead, then the body in a centred reading column. Each
 * heading the admin writes is a question, so each is set in the serif with a
 * hairline above it, and the answers under them read as one list of entries.
 * The body is the product page's markdown renderer, so the admin's preview is
 * what a reader gets.
 *
 * Only the body reads the database, so only it sits behind a `<Suspense>`
 * boundary; `connection()` keeps it out of the build, as on the home page.
 */
export default async function FaqPage() {
  const locale = await requestLocale();
  const messages = getMessages(locale).faqPage;

  return (
    <section className="pt-[72px] pb-[96px]">
      <div className="container-content">
        <header className="mx-auto max-w-[620px] text-center">
          <h1 className="font-display text-[40px] leading-[48px] font-normal text-ink sm:text-[48px] sm:leading-[56px]">
            {messages.title}
          </h1>
          <div aria-hidden className="mx-auto mt-5 h-px w-8 bg-gold/50" />
        </header>

        <div className="pt-[56px]">
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
      <p className="mx-auto max-w-[620px] text-center font-display text-[18px] leading-7 text-ink-55 italic">
        {messages.empty}{" "}
        <Link href={localePath(locale, "/contact")} className="text-ink not-italic underline decoration-gold underline-offset-4 hover:decoration-ink">
          {messages.askUs}
        </Link>
        .
      </p>
    );
  }

  return (
    <MarkdownBody
      blocks={blocks}
      className="mx-auto flex max-w-[720px] flex-col gap-4 text-[16px] leading-[28px] text-ink-62 [&_strong]:font-medium [&_strong]:text-ink [&_:is(h2,h3,h4):not(:first-child)]:mt-6 [&_:is(h2,h3,h4):not(:first-child)]:border-t [&_:is(h2,h3,h4):not(:first-child)]:border-line [&_:is(h2,h3,h4):not(:first-child)]:pt-8 [&_:is(h2,h3,h4)]:font-display [&_:is(h2,h3,h4)]:font-normal [&_:is(h2,h3,h4)]:text-ink [&_h2]:text-[26px] [&_h2]:leading-9 [&_h3]:text-[21px] [&_h3]:leading-8"
    />
  );
}
