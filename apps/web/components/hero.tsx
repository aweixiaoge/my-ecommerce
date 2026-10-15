import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-mist">
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
      <div className="container-content flex flex-col gap-10 py-[72px] bar:flex-row bar:items-center bar:gap-16">
        <div className="bar:w-[637.52px]">
          <p className="text-[13px] font-semibold tracking-[1.744px] uppercase leading-[21.45px] text-ink-55">
            Hand-tested audio gear
          </p>

          <h1 className="mt-[18px] text-[38px] leading-[1.1] font-bold tracking-[-0.658px] text-ink sm:text-[50px] sm:leading-[55px]">
            Sound that keeps up with your day.
          </h1>

          <p className="mt-5 text-[18px] leading-[29.7px] tracking-[-0.439px] text-ink-62">
            Wireless earbuds, earphones and headphones — every one of them
            tested by our own team before it reaches your cart.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link
              href="/shop"
              prefetch={false}
              className="rounded-[3px] bg-ink px-5 py-[5px] text-[15px] font-medium leading-[24.75px] tracking-[-0.234px] text-paper"
            >
              Shop all products
            </Link>
            <Link
              href="/about"
              prefetch={false}
              className="rounded-[3px] border-[1.818px] border-ink px-5 py-[5px] text-[15px] font-medium leading-[24.75px] tracking-[-0.234px] text-ink"
            >
              Read our story
            </Link>
          </div>
        </div>

        <div className="relative aspect-[889/500] w-full overflow-hidden rounded-card bar:w-[588.48px]">
          <Image
            src="/images/hero-audio.jpg"
            alt="Wireless over-ear headphones on a shoreline"
            fill
            sizes="(min-width: 768px) 46vw, 100vw"
            className="object-cover"
            priority
          />
        </div>
      </div>
    </section>
  );
}
