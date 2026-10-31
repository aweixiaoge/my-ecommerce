import Image from "next/image";
import Link from "next/link";
import type { Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/languages";

/**
 * The Shop page's opening block — the design's `Header` (node 178:8357):
 * a 30/45 title, 20px, then a 300.675-tall band holding a two-column banner.
 *
 * The banner is a 1×2 grid of FIXED columns, 722.393 and 567.607 with no gap,
 * so the image and the text block meet edge to edge. The text column carries
 * 45.405px of side padding, which is what makes its copy 476.797 wide — the
 * paragraph's own FIXED width in Figma.
 *
 * The design's copy here is template filler ("What's the problem?" over a
 * paragraph about trees yielding chemicals, beside a photo of cracked soil).
 * The layout is reproduced; the words are ours. See the handover note.
 *
 * Dressed in the storefront's luxury register: the title as the Journal's
 * centred serif masthead, and the banner's text column on ivory, so image and
 * copy read as one panel rather than a picture beside loose text.
 */
export function ShopBanner({
  messages,
  locale,
}: {
  /** This locale's `shop` slice of the catalog — the banner's own copy. */
  messages: Messages["shop"];
  locale: Locale;
}) {
  return (
    <header>
      <div className="text-center">
        <h1 className="font-display text-[40px] leading-[48px] font-normal text-ink sm:text-[48px] sm:leading-[56px]">
          {messages.title}
        </h1>
        <div aria-hidden className="mx-auto mt-5 h-px w-8 bg-gold/50" />
      </div>

      {/*
        The 300.675px is the design's own container height, and the 20px is
        where the grid sits inside it — not a margin that adds to it.
      */}
      <div className="h-auto pt-[48px] bar:min-h-[300.675px]">
        {/*
          The design's columns are FIXED at 722.393 and 567.607 — but they only
          add up to 1290, so pinning them means the text column is crushed to
          nothing the moment the container is narrower than the design, which
          is every viewport from 1024 to 1338. They are carried as 56/44
          instead: 722.393 and 567.607 are exactly 56% and 44% of 1290, so the
          design's own split is what renders at the design's own width, and it
          degrades arithmetically below that rather than collapsing.
        */}
        <div className="grid grid-cols-1 bar:grid-cols-[56fr_44fr]">
          {/*
            `aspect-auto` at lg hands the height to the grid row, which the
            text column sizes — that is what keeps the image flush with the
            copy beside it when the copy needs an extra line.
          */}
          <div className="relative aspect-[722.393/273.366] overflow-hidden bg-ivory bar:aspect-auto bar:min-h-[320px]">
            <Image
              src="/images/why-buy.jpg"
              alt={messages.bannerImageAlt}
              fill
              sizes="(min-width: 768px) 56vw, 100vw"
              className="object-cover"
              priority
            />
          </div>

          {/*
            8% is the design's own 45.405px expressed as a share of the 567.607
            column it sits in, which is what makes it the right number at the
            design's width *and* the right number at `bar`, where a fixed
            45.405 each side would eat a quarter of the column.
          */}
          <div className="flex flex-col justify-center bg-ivory px-6 py-10 bar:px-[8%] bar:py-12">
            <h2 className="font-display text-[30px] leading-[38px] font-normal text-ink sm:text-[34px] sm:leading-[42px]">
              {messages.bannerTitle}
            </h2>

            <p className="mt-5 text-[15px] leading-[27px] text-ink-62">
              {messages.bannerBody}
            </p>

            <div className="mt-8 flex items-center gap-6">
              <Link
                href={localePath(locale, "/about")}
                prefetch={false}
                className="inline-flex h-11 items-center justify-center border border-ink px-7 text-[13px] leading-5 font-medium tracking-[0.14em] text-ink transition-colors duration-300 hover:bg-ink hover:text-paper"
              >
                {messages.bannerCta}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
