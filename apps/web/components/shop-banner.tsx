import Image from "next/image";
import Link from "next/link";

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
 * The layout is reproduced exactly; the words are ours. See the handover note.
 */
export function ShopBanner() {
  return (
    <header>
      <h1 className="text-[30px] leading-[45px] font-bold tracking-[0.3955px] text-ink">
        Shop
      </h1>

      {/*
        The 300.675px is the design's own container height, and the 20px is
        where the grid sits inside it — not a margin that adds to it.
      */}
      <div className="h-auto pt-5 bar:min-h-[300.675px]">
        {/*
          The design's columns are FIXED at 722.393 and 567.607 — but they only
          add up to 1290, so pinning them means the text column is crushed to
          nothing the moment the container is narrower than the design, which
          is every viewport from 1024 to 1338. They are carried as 56/44
          instead: 722.393 and 567.607 are exactly 56% and 44% of 1290, so the
          design's own split is what renders at the design's own width, and it
          degrades arithmetically below that rather than collapsing.
        */}
        <div className="grid grid-cols-1 gap-6 bar:grid-cols-[56fr_44fr] bar:gap-0">
          {/*
            `aspect-auto` at lg hands the height to the grid row, which the
            text column sizes — that is what keeps the image flush with the
            copy beside it when the copy needs an extra line.
          */}
          <div className="relative aspect-[722.393/273.366] overflow-hidden bg-mist bar:aspect-auto bar:min-h-[273.366px]">
            <Image
              src="/images/why-buy.jpg"
              alt="A pair of headphones on a ridged surface"
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
          <div className="bar:px-[8%]">
            <h2 className="text-[32px] leading-[48px] font-bold tracking-[0.40625px] text-ink">
              Hand-tested gear
            </h2>

            <p className="mt-[19.6px] text-[17px] leading-[28.05px] tracking-[-0.4316px] text-ink">
              Every pair that reaches this page has been worn by someone here
              first. Battery life measured across a week of commutes, fit
              checked on a run, calls taken on a busy street. The ones that did
              not hold up never made it into the catalogue — and what we learned
              testing them is in the journal.
            </p>

            <div className="mt-[25.5px] flex items-center gap-6">
              <Link
                href="/about"
                prefetch={false}
                className="inline-flex h-10 items-center justify-center rounded-[3px] bg-ink px-5 text-[15px] leading-[24.75px] font-medium tracking-[-0.2344px] text-paper"
              >
                Learn more
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
