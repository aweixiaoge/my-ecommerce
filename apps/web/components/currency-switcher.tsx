"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { setCurrency } from "@/app/[lang]/currency-actions";
import type { DisplayCurrency } from "@/lib/currency/display";
import { fill } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";

/**
 * The header's currency switcher: the design's `Link - Currency` (Figma, the
 * sibling of `Link - Language` 179:1818) closed, and the same dropdown open.
 *
 * The design draws the two controls as a pair — `Dropdown Menu - Language`
 * is captioned "Language & currency switchers — open state" — so everything
 * about the menu is the language switcher's, box for box: the 180px panel,
 * its 36px rows, its neutral #D4D4D4 border, and its hanging from the bar's
 * bottom edge rather than from the trigger's own box. `language-switcher.tsx`
 * explains why that is where it hangs, and the two must stay identical or the
 * pair will open at two different heights.
 *
 * What differs is what a row *is*. A language row is a link, because the
 * language is part of the address and choosing one is going to another page. A
 * currency row is a submit button in a form, because the currency is a cookie
 * (`packages/shared/src/common.ts`) and choosing one is the same page rendered
 * again — the URL the reader can share, crawl and bookmark is untouched. The
 * form posts the chosen code to a Server Action, which sets the cookie; Next
 * re-renders the page and its layouts from the new value, which is why nothing
 * here navigates or refreshes by hand.
 *
 * The rows show codes rather than names — `EUR`, not "Euro" — which is the
 * design's own voice for this control: the trigger reads `USD` in the bar, and
 * a currency code is a proper noun that does not translate (the note at the top
 * of `lib/i18n/messages/en.ts`). The active row is marked the three ways the
 * language menu marks its own: bold, the #F2F2F2 fill, and the check.
 *
 * Like the language switcher it renders twice — once in the nav, once in the
 * bar — and only the classes that seat the trigger differ between the two. Its
 * menu closes on Escape and on a press anywhere else, for the reason that one
 * gives: a menu this small is easy to leave open without noticing, and the
 * listener is `pointerdown` so that a press starting outside and lifted over a
 * row cannot both close the menu and choose the row.
 */
const PLACEMENT = {
  nav: {
    wrapper: "hidden h-full items-center lg:flex",
    trigger:
      "flex items-center gap-1.5 px-[12.5px] text-[13px] font-bold leading-[16.9px] tracking-[-0.076px] text-ink",
  },
  bar: {
    wrapper: "flex h-full items-center lg:hidden",
    trigger:
      "flex items-center gap-1 py-2 pr-2 text-[12px] font-bold leading-[16.9px] tracking-[-0.076px] whitespace-nowrap text-ink sm:gap-1.5 sm:pr-3 sm:text-[13px]",
  },
} as const;

export type Placement = keyof typeof PLACEMENT;

export function CurrencySwitcher({
  display,
  messages,
  placement,
}: {
  /** The currency prices are written in, and everything the menu offers. */
  display: DisplayCurrency;
  /** This locale's `header` slice of the catalog. */
  messages: Messages["header"];
  placement: Placement;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={root} className={`relative ${PLACEMENT[placement].wrapper}`}>
      {/*
        The name carries the visible code, so the control says what it does
        without contradicting what it shows: "Currency: USD" rather than a bare
        "USD". The language trigger is named the same way, one control along.
      */}
      <button
        type="button"
        aria-label={fill(messages.currency, { code: display.code })}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={PLACEMENT[placement].trigger}
      >
        <TriggerContent currency={display.code} />
      </button>

      {/*
        The form wraps the list, and every row is a submit button carrying its
        own code — no handler of its own, and no `router.refresh()` anywhere
        near it. The form is what says which field the action is about to read;
        submitting it is the whole of what a row does, and the cookie and the
        re-render belong to the action and the framework, in that order (see
        `app/[lang]/currency-actions.ts`).

        Hidden rather than unmounted when closed, so the rows are never tabbable
        out of a closed menu — the same trade the language switcher and the
        header's own nav panel make.
      */}
      <div
        id={panelId}
        className={`absolute top-full right-0 z-50 w-[180px] rounded-[3px] border border-[#d4d4d4] bg-paper p-2 shadow-[0_8px_24px_rgba(0,0,0,0.1)] ${
          open ? "block" : "hidden"
        }`}
      >
        <form action={setCurrency}>
          <ul>
            {display.options.map((option) => {
              const isActive = option.code === display.code;

              return (
                <li key={option.code}>
                  <button
                    type="submit"
                    name="currency"
                    value={option.code}
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex h-9 w-full items-center gap-2 rounded-[3px] pl-3 pr-2.5 text-left text-[13px] leading-[16.9px] tracking-[-0.076px] text-ink ${
                      isActive ? "bg-[#f2f2f2] font-bold" : "font-normal"
                    }`}
                  >
                    <span className="flex-1">{option.code}</span>
                    {isActive && (
                      <Image src="/icons/check.svg" alt="" width={12} height={12} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </form>
      </div>
    </div>
  );
}

/**
 * The closed trigger on its own — what the header renders while the switcher's
 * read is in flight (see the note in `app/[lang]/layout.tsx`).
 *
 * It is the trigger's markup and its placement classes, without the menu and
 * without a button that claims to open one: `aria-expanded="false"` and no
 * `aria-controls`, because the panel it would point at does not exist yet. The
 * row's geometry is identical, so nothing moves when the real control arrives.
 *
 * `currency` is the shop's own, and a reader who last chose euros sees it for
 * the moment the read takes — the language trigger does not have this problem
 * because the language is in the address and is known before the page is
 * rendered. Nothing better is available: a blank box of the same width would
 * hide the code rather than be honest about it, and this is the same "the shop's
 * currency until told otherwise" the page is written in when no cookie is set.
 */
export function CurrencyTrigger({
  currency,
  placement,
}: {
  currency: string;
  placement: Placement;
}) {
  return (
    <div className={PLACEMENT[placement].wrapper}>
      <span className={PLACEMENT[placement].trigger}>
        <TriggerContent currency={currency} />
      </span>
    </div>
  );
}

/** The code, and the chevron the design pairs it with. */
function TriggerContent({ currency }: { currency: string }) {
  return (
    <>
      {currency}
      <Image src="/icons/chevron-down.svg" alt="" width={9} height={6} />
    </>
  );
}
