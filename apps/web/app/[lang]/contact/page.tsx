import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { ContactDetails, ContactDetailsFallback } from "@/components/contact/contact-details";
import { ContactForm } from "@/components/contact/contact-form";
import { getStoreContact } from "@/lib/contact/store-contact-repo";
import { getMessages, type Messages } from "@/lib/i18n/messages";
import { requestLocale } from "@/lib/i18n/request";

export async function generateMetadata(): Promise<Metadata> {
  const messages = getMessages(await requestLocale());

  return { title: messages.contactPage.title, description: messages.contactPage.description };
}

/**
 * The Contact page (Figma 178:7601).
 *
 * The design's article — a title, the intro, then two equal columns: the form,
 * then "Get in Touch" — set in the storefront's luxury register: a centred
 * serif masthead with the intro as its standfirst, and the details beside the
 * form behind a hairline. Under `bar` the columns stack, form first,
 * since writing to the shop is what the page is for.
 *
 * Only "Get in Touch" reads the database — the details the admin edits under
 * Contact → Info — so only it sits behind a `<Suspense>` boundary. The title,
 * intro and form are static and ship in the prerendered shell.
 */
export default async function ContactPage() {
  const locale = await requestLocale();
  const messages = getMessages(locale).contactPage;

  return (
    <section className="pt-[72px] pb-[96px]">
      <div className="container-content">
        <header className="mx-auto max-w-[620px] text-center">
          <h1 className="font-display text-[40px] leading-[48px] font-normal text-ink sm:text-[48px] sm:leading-[56px]">{messages.title}</h1>
          <div aria-hidden className="mx-auto mt-5 h-px w-8 bg-gold/50" />
          <p className="pt-5 text-[15px] leading-[26px] text-ink-62">{messages.intro}</p>
        </header>

        <div className="grid grid-cols-1 gap-[48px] pt-[64px] bar:grid-cols-2 bar:gap-[56px]">
          <ContactForm locale={locale} messages={messages} />
          <Suspense fallback={<ContactDetailsFallback messages={messages} />}>
            <ContactDetailsSection messages={messages} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}

/**
 * The details, read when the page is requested. `connection()` is what keeps
 * them out of the build, as on the home page: without it the column would show
 * whatever the admin had saved at build time.
 */
async function ContactDetailsSection({ messages }: { messages: Messages["contactPage"] }) {
  await connection();

  return <ContactDetails contact={await getStoreContact()} messages={messages} />;
}
