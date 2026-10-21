"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { fill } from "@/lib/i18n/format";
import { swapLocale } from "@/lib/i18n/paths";
import type { Messages } from "@/lib/i18n/messages";
import { LANGUAGES, type Locale } from "@/lib/languages";

/**
 * The header's language switcher: the design's `Link - Language` (Figma
 * 179:1818) closed, and its `Dropdown Menu - Language` (180:1866) open.
 *
 * The design draws the menu detached from the bar — the component section
 * carries it under the note "Language & currency switchers — open state" — so
 * where it hangs is ours to choose. It hangs from the bar's bottom edge, not
 * from the trigger's own box: the trigger is a line of 13px text centred in a
 * 100px bar, and a menu opening at its foot would cover the bar's lower half
 * and read as clipped into it. That is what the flanks' `h-full` in
 * `site-header.tsx` is for — a full-height wrapper is what makes `top-full`
 * mean the bar's edge rather than the text's.
 *
 * A row is *this page* in another language, not the other language's home
 * page: from `/en/shop`, choosing Deutsch goes to `/de/shop`. That is what the
 * address in the URL buys — the language is a property of the address, so
 * switching it is a swap of the first segment and not a trip back to the
 * front door. The current pathname comes from `usePathname`, which is why both
 * copies in the header sit inside a `<Suspense>` boundary: on a route with
 * dynamic segments the framework cannot resolve a pathname while prerendering.
 *
 * Which language is current also comes from the address rather than from
 * anything this component remembers — the same rule, and the reason a page
 * rendered from the cache under `/de` marks Deutsch rather than English.
 *
 * It is a disclosure, not a `role="menu"`: every row navigates to another
 * language's page, so the arrow-key model of a menu would be a promise this
 * control cannot keep. A button with `aria-expanded` and `aria-controls` over
 * a list of links is the same shape the header's collapsed-nav toggle uses,
 * for the same reason. Hidden rather than unmounted when closed, so the rows
 * are never tabbable out of a closed menu — the same trade the nav panel
 * below the bar makes.
 *
 * Escape and a press anywhere else both close it. A menu this small is easy
 * to leave open without noticing, and the toggle alone would make closing it
 * a hunt; the listener is `pointerdown` rather than `click` so that a press
 * starting outside and lifted over a row cannot both close the menu and
 * follow the row's link.
 *
 * The trigger shows the code and the menu shows the names, which is the
 * design's own split — `EN` in the bar, `English` in the list. A name is the
 * language's own word for itself, so it is read from the language list rather
 * than from the catalog: "Deutsch" is "Deutsch" on every page. The active row
 * is marked three ways, all of them the design's: bold against the others'
 * regular, the #F2F2F2 fill, and the check at its right, in the 12px box the
 * row's spacing is measured around.
 *
 * Like the currency switcher this renders twice — once in the nav and once in
 * the bar — because the nav drops its copy between `bar` and `lg`. Only the
 * classes that seat the trigger in its row differ between the two; the menu
 * is the same control either way.
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

type Placement = keyof typeof PLACEMENT;

export function LanguageSwitcher({
  locale,
  messages,
  placement,
}: {
  /** The language this page is being read in — the one marked in the menu. */
  locale: Locale;
  /** This locale's `header` slice of the catalog. */
  messages: Messages["header"];
  placement: Placement;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

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
        without contradicting what it shows: "Language: EN" rather than a bare
        "EN", which is what the design's three characters mean.
      */}
      <button
        type="button"
        aria-label={fill(messages.language, { code: locale.toUpperCase() })}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={PLACEMENT[placement].trigger}
      >
        <TriggerContent locale={locale} />
      </button>

      {/*
        The panel's 180px and its 162px rows are the design's, and they are
        arithmetically exact: the 1px border and the 8px of padding are
        inside the width, which is what leaves 162 for the row. The border is
        the menu's own #D4D4D4 rather than `line` — the design draws this
        component in a neutral grey, not the blue-tinted rule the rest of the
        chrome uses.
      */}
      <div
        id={panelId}
        className={`absolute top-full right-0 z-50 w-[180px] rounded-[3px] border border-[#d4d4d4] bg-paper p-2 shadow-[0_8px_24px_rgba(0,0,0,0.1)] ${
          open ? "block" : "hidden"
        }`}
      >
        <ul>
          {LANGUAGES.map((language) => {
            const isActive = language.code === locale;

            return (
              <li key={language.code}>
                <Link
                  href={swapLocale(pathname, language.code)}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => setOpen(false)}
                  className={`flex h-9 items-center gap-2 rounded-[3px] pl-3 pr-2.5 text-[13px] leading-[16.9px] tracking-[-0.076px] text-ink ${
                    isActive ? "bg-[#f2f2f2] font-bold" : "font-normal"
                  }`}
                >
                  <span className="flex-1">{language.label}</span>
                  {isActive && (
                    <Image src="/icons/check.svg" alt="" width={12} height={12} />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/**
 * The closed trigger on its own — what the header renders while the switcher
 * is suspended (see the note in `site-header.tsx`).
 *
 * It is the trigger's markup and its placement classes, without the menu and
 * without a button that claims to open one: `aria-expanded="false"` and no
 * `aria-controls`, because the panel it would point at does not exist yet.
 * The row's geometry is identical, so nothing moves when the real control
 * arrives.
 */
export function LanguageTrigger({
  locale,
  placement,
}: {
  locale: Locale;
  placement: Placement;
}) {
  return (
    <div className={PLACEMENT[placement].wrapper}>
      <span className={PLACEMENT[placement].trigger}>
        <TriggerContent locale={locale} />
      </span>
    </div>
  );
}

/** The code, and the chevron the design pairs it with. */
function TriggerContent({ locale }: { locale: Locale }) {
  return (
    <>
      {locale.toUpperCase()}
      <Image src="/icons/chevron-down.svg" alt="" width={9} height={6} />
    </>
  );
}
