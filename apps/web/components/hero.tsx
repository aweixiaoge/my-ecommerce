import Image from "next/image";
import Link from "next/link";
import type { HeroProduct } from "@/lib/catalog/featured-rows";
import type { Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/languages";

/**
 * The home page's opening block, in two contents and one layout.
 *
 * With a product — the newest one an admin featured, which is
 * `lib/catalog/featured-repo.ts`'s job to find — it draws that product's name,
 * blurb and photograph, and a button to its own page. With none it draws the
 * copy the page has always had. The second is the first's fallback rather than
 * a second design: a database with nothing featured looks exactly as this page
 * looked before it read a database at all, which is what stops the two states
 * from drifting apart.
 *
 * The eyebrow and "Read our story" never move. They are the shop's voice rather
 * than a product's, and a product that has no blurb written yet should not take
 * the sentence about the shop away with it.
 *
 * The image's dimensions and alt text are described in the design, and the
 * copy is the catalog's — so a German hero draws a German sentence over a
 * featured product whose name is still English, until someone translates the
 * product. That is the fallback rule the whole storefront follows.
 */
export function Hero({
  product,
  messages,
  locale,
}: {
  product: HeroProduct | null;
  /** This locale's `hero` slice of the catalog. */
  messages: Messages["hero"];
  locale: Locale;
}) {
  return (
    <section className="bg-ivory">
      {/*
        Side by side from `bar` — the width at which the header puts its own
        nav back in the bar, so the two decide together what counts as a
        desktop window. Below it the copy sits over the image.

        The two columns are the design's widths — 637.52 and 588.48 either side
        of a 64px gap, which is the 1290px the container is built to hold. They
        add up to more than that below a ~1338px viewport, and both are allowed
        to shrink so the row gives way instead of pushing the page sideways:
        neither column carries `shrink-0`, so the shortfall is split 52:48 and
        the pair keeps the design's proportions at every width from `bar` up.
        The image keeps its aspect ratio as it narrows, and at a full 1290 the
        two of them are back at the design's exact pixels.
      */}
      <div className="container-content flex flex-col gap-10 py-[88px] bar:flex-row bar:items-center bar:gap-16">
        <div className="bar:w-[637.52px]">
          <p className="text-[11px] leading-4 font-medium tracking-[0.22em] text-gold uppercase">
            {messages.eyebrow}
          </p>

          <h1 className="mt-5 font-display text-[40px] leading-[1.12] font-normal text-ink sm:text-[56px] sm:leading-[64px]">
            {product ? product.name : messages.fallbackTitle}
          </h1>

          {/*
            A product with no blurb draws no paragraph rather than the shop's
            copy: a sentence about the range on a page about one product is
            worse than the space it would fill.
          */}
          {product ? (
            product.shortDescription && (
              <p className="mt-6 max-w-[520px] text-[17px] leading-[29px] text-ink-62">
                {product.shortDescription}
              </p>
            )
          ) : (
            <p className="mt-6 max-w-[520px] text-[17px] leading-[29px] text-ink-62">
              {messages.fallbackBody}
            </p>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href={product ? product.href : localePath(locale, "/shop")}
              // A product page is built and so is `/shop`, but the link here is
              // the one the whole page exists to show, and a prefetch of it
              // would race the read that decides where it points.
              prefetch={false}
              className="inline-flex h-11 items-center justify-center border border-ink bg-ink px-7 text-[13px] leading-5 font-medium tracking-[0.14em] text-paper transition-colors duration-300 hover:bg-paper hover:text-ink"
            >
              {product ? messages.ctaProduct : messages.ctaFallback}
            </Link>
            <Link
              href={localePath(locale, "/about")}
              prefetch={false}
              className="inline-flex h-11 items-center justify-center border border-ink px-7 text-[13px] leading-5 font-medium tracking-[0.14em] text-ink transition-colors duration-300 hover:bg-ink hover:text-paper"
            >
              {messages.story}
            </Link>
          </div>
        </div>

        <div className="relative aspect-[889/500] w-full overflow-hidden bar:w-[588.48px]">
          {product ? (
            product.image ? (
              <Image
                src={product.image.url}
                // The card's rule: a picture with no alt text of its own
                // describes the product it is on.
                alt={product.image.alt ?? product.name}
                fill
                sizes="(min-width: 768px) 46vw, 100vw"
                className="object-cover"
                priority
              />
            ) : (
              // A product photographed nowhere: the slot stays its size, in
              // paper against the mist, so the row does not collapse around a
              // missing picture.
              <div className="h-full w-full bg-paper" />
            )
          ) : (
            <Image
              src="/images/hero-audio.jpg"
              alt={messages.imageAlt}
              fill
              sizes="(min-width: 768px) 46vw, 100vw"
              className="object-cover"
              priority
            />
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * What stands in while the featured product is being read.
 *
 * The hero's own shape, in paper against the mist, so the page below it does
 * not jump when the real content lands. `aria-hidden` because there is nothing
 * here to announce — the heading and the button arrive with the read.
 */
export function HeroFallback() {
  return (
    <section aria-hidden className="bg-ivory">
      <div className="container-content flex animate-pulse flex-col gap-10 py-[88px] bar:flex-row bar:items-center bar:gap-16">
        <div className="bar:w-[637.52px]">
          <div className="h-[21.45px] w-[190px] bg-paper/60" />
          <div className="mt-[18px] h-[55px] w-full bg-paper/60 sm:h-[110px]" />
          <div className="mt-5 h-[59px] w-[85%] bg-paper/60" />
          <div className="mt-8 h-[34.75px] w-[163px] bg-paper/60" />
        </div>

        <div className="aspect-[889/500] w-full overflow-hidden bg-paper/60 bar:w-[588.48px]" />
      </div>
    </section>
  );
}
