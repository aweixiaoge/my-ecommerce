import Link from "next/link";

/**
 * The heading row shared by "New arrivals" and "From the journal": a bold
 * 35px title on the left, an underlined link on the right, baseline-aligned.
 */
export function SectionHeading({
  title,
  linkLabel,
  linkHref,
  linkPrefetch,
}: {
  title: string;
  linkLabel: string;
  linkHref: string;
  /** `false` while the destination is unbuilt — see the note in `lib/nav.ts`.
   *  Left off, the link prefetches, which is what a built route wants. */
  linkPrefetch?: false;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <h2 className="text-[26px] leading-[1.3] font-bold tracking-[0.380px] text-ink sm:text-[35px] sm:leading-[52.5px]">
        {title}
      </h2>
      <Link
        href={linkHref}
        prefetch={linkPrefetch}
        className="text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink underline"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

/**
 * The storefront's centred heading: a serif title, the short gold rule under
 * it, and the link as small tracked capitals. `SectionHeading` above stays as
 * it was for the admin, which shares it.
 */
export function EditorialHeading({
  title,
  linkLabel,
  linkHref,
}: {
  title: string;
  linkLabel: string;
  linkHref: string;
}) {
  return (
    <div className="text-center">
      <h2 className="font-display text-[30px] leading-[38px] font-normal text-ink sm:text-[36px] sm:leading-[44px]">
        {title}
      </h2>
      <div aria-hidden className="mx-auto mt-4 h-px w-8 bg-gold/50" />
      <Link
        href={linkHref}
        className="mt-4 inline-block text-[11px] leading-4 tracking-[0.18em] text-ink-55 uppercase underline-offset-4 hover:text-ink hover:underline"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
