import Link from "next/link";
import { localePath } from "@/lib/i18n/paths";
import type { Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/languages";

export function ContactCta({
  messages,
  locale,
}: {
  /** This locale's `contact` slice of the catalog. */
  messages: Messages["contact"];
  locale: Locale;
}) {
  return (
    <section className="bg-ink">
      <div className="container-content flex flex-col items-center py-[72px] text-center">
        <h2 className="max-w-[720px] text-[26px] leading-[1.3] font-bold tracking-[0.380px] text-paper sm:text-[35px] sm:leading-[52.5px]">
          {messages.title}
        </h2>

        <p className="mt-4 max-w-[720px] text-[17px] leading-[28.05px] tracking-[-0.431px] text-paper/72">
          {messages.body}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
          <Link
            href={localePath(locale, "/contact")}
            className="rounded-[3px] bg-paper px-5 py-[5px] text-[15px] font-medium leading-[24.75px] tracking-[-0.234px] text-ink"
          >
            {messages.contact}
          </Link>

          {/*
            The design fills this button with color/ink — black on a black
            band, so it renders as plain text with no visible affordance. That
            is what the comp shows, and it is reproduced rather than corrected;
            see the note in the handover about it reading as a non-button.
          */}
          <Link
            href={localePath(locale, "/faq")}
            className="rounded-[3px] px-5 py-[5px] text-[15px] font-medium leading-[24.75px] tracking-[-0.234px] text-paper"
          >
            {messages.faq}
          </Link>
        </div>
      </div>
    </section>
  );
}
