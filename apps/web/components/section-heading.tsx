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
