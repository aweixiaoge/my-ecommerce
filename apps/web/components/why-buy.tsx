import Image from "next/image";
import Link from "next/link";
import { localePath } from "@/lib/i18n/paths";
import type { Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/languages";

export function WhyBuy({
  messages,
  locale,
}: {
  /** This locale's `whyBuy` slice of the catalog. */
  messages: Messages["whyBuy"];
  locale: Locale;
}) {
  return (
    <section className="bg-mist">
      {/*
        The hero's mirror — its image on the left, text on the right — and it
        switches at the same width for the same reason. Both columns carry the
        design's width and neither is held at it: 588.48 + 64 + 637.52 is the
        same 1290 the container holds, so below a ~1338px viewport the two
        give way in proportion rather than squeezing one of them to nothing.
      */}
      <div className="container-content flex flex-col gap-10 py-[72px] bar:flex-row bar:items-center bar:gap-16">
        <div className="relative aspect-[889/500] w-full overflow-hidden rounded-card bar:w-[588.48px]">
          <Image
            src="/images/why-buy.jpg"
            alt={messages.imageAlt}
            fill
            sizes="(min-width: 768px) 46vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="bar:w-[637.52px]">
          <p className="text-[13px] font-semibold tracking-[1.744px] uppercase leading-[21.45px] text-ink-55">
            {messages.eyebrow}
          </p>

          <h2 className="mt-[18px] text-[26px] leading-[1.3] font-bold tracking-[0.380px] text-ink sm:text-[35px] sm:leading-[52.5px]">
            {messages.title}
          </h2>

          <p className="mt-5 text-[17px] leading-[28.05px] tracking-[-0.431px] text-ink-62">
            {messages.body}
          </p>

          <Link
            href={localePath(locale, "/about")}
            prefetch={false}
            className="mt-7 inline-block rounded-[3px] bg-ink px-5 py-[5px] text-[15px] font-medium leading-[24.75px] tracking-[-0.234px] text-paper"
          >
            {messages.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
