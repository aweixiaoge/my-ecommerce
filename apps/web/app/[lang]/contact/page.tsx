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
 * The design's article: a 30/45 title, the intro 40px below it, and 24px below
 * that two equal columns with 24px between them — the form, then "Get in
 * Touch". Under `bar` the columns stack, form first, since writing to the shop
 * is what the page is for.
 *
 * Only "Get in Touch" reads the database — the details the admin edits under
 * Contact → Info — so only it sits behind a `<Suspense>` boundary. The title,
 * intro and form are static and ship in the prerendered shell.
 */
export default async function ContactPage() {
  const locale = await requestLocale();
  const messages = getMessages(locale).contactPage;

  return (
    <section className="bg-wash py-[60px]">
      <div className="container-content">
        <h1 className="text-[30px] leading-[45px] font-bold tracking-[0.3955px] text-ink">{messages.title}</h1>

        <p className="pt-[40px] text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink">{messages.intro}</p>

        <div className="grid grid-cols-1 gap-[24px] pt-[24px] bar:grid-cols-2">
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
