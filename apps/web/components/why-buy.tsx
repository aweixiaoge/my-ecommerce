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
    <section className="bg-ivory">
      {/*
        The hero's mirror — its image on the left, text on the right — and it
        switches at the same width for the same reason. Both columns carry the
        design's width and neither is held at it: 588.48 + 64 + 637.52 is the
        same 1290 the container holds, so below a ~1338px viewport the two
        give way in proportion rather than squeezing one of them to nothing.
      */}
      <div className="container-content flex flex-col gap-10 py-[96px] bar:flex-row bar:items-center bar:gap-16">
        <div className="relative aspect-[889/500] w-full overflow-hidden bar:w-[588.48px]">
          <Image
            src="/images/why-buy.jpg"
            alt={messages.imageAlt}
            fill
            sizes="(min-width: 768px) 46vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="bar:w-[637.52px]">
          <p className="text-[11px] leading-4 font-medium tracking-[0.22em] text-gold uppercase">
            {messages.eyebrow}
          </p>

          <h2 className="mt-5 font-display text-[32px] leading-[40px] font-normal text-ink sm:text-[42px] sm:leading-[52px]">
            {messages.title}
          </h2>

          <p className="mt-6 max-w-[540px] text-[16px] leading-[28px] text-ink-62">
            {messages.body}
          </p>

          <Link
            href={localePath(locale, "/about")}
            className="mt-10 inline-flex h-11 items-center justify-center border border-ink px-7 text-[13px] leading-5 font-medium tracking-[0.14em] text-ink transition-colors duration-300 hover:bg-ink hover:text-paper"
          >
            {messages.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
