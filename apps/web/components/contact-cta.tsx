import Link from "next/link";

export function ContactCta() {
  return (
    <section className="bg-ink">
      <div className="container-content flex flex-col items-center py-[72px] text-center">
        <h2 className="max-w-[720px] text-[26px] leading-[1.3] font-bold tracking-[0.380px] text-paper sm:text-[35px] sm:leading-[52.5px]">
          Not sure which pair is right for you?
        </h2>

        <p className="mt-4 max-w-[720px] text-[17px] leading-[28.05px] tracking-[-0.431px] text-paper/72">
          Tell us how you listen and we’ll point you at the right model — or
          start with the questions everyone asks.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
          <Link
            href="/contact"
            prefetch={false}
            className="rounded-[3px] bg-paper px-5 py-[5px] text-[15px] font-medium leading-[24.75px] tracking-[-0.234px] text-ink"
          >
            Contact us
          </Link>

          {/*
            The design fills this button with color/ink — black on a black
            band, so it renders as plain text with no visible affordance. That
            is what the comp shows, and it is reproduced rather than corrected;
            see the note in the handover about it reading as a non-button.
          */}
          <Link
            href="/faq"
            prefetch={false}
            className="rounded-[3px] px-5 py-[5px] text-[15px] font-medium leading-[24.75px] tracking-[-0.234px] text-paper"
          >
            Read the FAQ
          </Link>
        </div>
      </div>
    </section>
  );
}
