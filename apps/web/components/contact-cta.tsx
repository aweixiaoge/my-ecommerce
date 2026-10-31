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
      <div className="container-content flex flex-col items-center py-[96px] text-center">
        <h2 className="max-w-[720px] font-display text-[32px] leading-[40px] font-normal text-paper sm:text-[42px] sm:leading-[52px]">
          {messages.title}
        </h2>
        <div aria-hidden className="mt-5 h-px w-8 bg-gold" />

        <p className="mt-5 max-w-[620px] text-[16px] leading-[28px] text-paper/72">
          {messages.body}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
          <Link
            href={localePath(locale, "/contact")}
            className="inline-flex h-11 items-center justify-center border border-paper px-7 text-[13px] leading-5 font-medium tracking-[0.14em] text-paper transition-colors duration-300 hover:bg-paper hover:text-ink"
          >
            {messages.contact}
          </Link>

          {/*
            The design fills this button with color/ink — black on a black
            band, so it read as plain text with no affordance. Here it is an
            honest text link instead: tracked, underlined on hover.
          */}
          <Link
            href={localePath(locale, "/faq")}
            className="text-[13px] leading-5 font-medium tracking-[0.14em] text-paper/80 underline-offset-[6px] transition-colors hover:text-paper hover:underline"
          >
            {messages.faq}
          </Link>
        </div>
      </div>
    </section>
  );
}
