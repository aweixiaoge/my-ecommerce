"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useId, useState, type ReactNode } from "react";
import type { Money } from "@my-ecommerce/shared";
import { LanguageSwitcher, LanguageTrigger } from "@/components/language-switcher";
import { formatMoney } from "@/lib/format";
import { localePath } from "@/lib/i18n/paths";
import type { Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/languages";

/**
 * The storefront header.
 *
 * Client-side because of the menu toggle below `bar`. Everything else here is
 * static and would work as a Server Component; the markup is cheap and the
 * whole component is small enough that splitting the toggle out on its own
 * would cost more than it saves. The copy and the links arrive as props for the
 * reason every client component here takes them that way: a catalog is
 * server-side, and this component needs one language's worth of it, not five.
 *
 * Two widths decide the header's shape, and neither is a device class — both
 * are measurements of what the bar holds.
 *
 * `bar` (768px) is where the seven routes come back into the bar and stay
 * there. It is the storefront's line between a narrow window and a desktop
 * one, not a header local: the hero's two columns, the product grids and the
 * rest of the compositions turn on the same query, because a header that
 * says "desktop" over a page that says "phone" is worse than either.
 *
 * `wide` (880px) is where the bar has room for the design's own spacing
 * again — the links back to 12.5px a side, the cart back to showing its
 * amount. Together those are what pull the row out to 779.23px of content:
 * 126.14 of wordmark, 483.49 of nav, 169.6 of actions. Add the 48px gutters
 * and the scrollbar and the bar wants ~842px of viewport to seat it with the
 * design's spacing intact, which is what 880 is for.
 *
 * At 768 the window offers the row 705px. The difference is closed rather
 * than conceded:
 *
 * - The links tighten to 8px of side padding between `bar` and `wide`. That
 *   is 63px back — the seven routes stay in the bar instead of moving behind
 *   a tap.
 * - The cart sheds its amount, 44px more, and picks it up again at `wide`.
 *   An icon-only cart is the same trade the phone widths already make.
 * - The two switchers stay out of the nav below `lg` — the 144px they cost is
 *   the one saving not worth making, since the actions cluster carries a pair
 *   at every width under `lg` anyway. The nav takes its own pair back at `lg`.
 *
 * That is 671.33px of content against 705, so the row seats with ~34px in
 * hand rather than being fitted to the last pixel.
 *
 * Below `bar` the nav collapses into a panel and a toggle takes its place.
 * The switchers do not go into that panel: they are the only control for
 * either setting, so they stay in the bar rather than behind a tap.
 *
 * The language switcher is a dropdown whose menu hangs from the bar's bottom
 * edge — not from the trigger's own box, which is a line of 13px text centred
 * in a 100px row. That is what `h-full` on the nav and on the actions cluster
 * below is for: `top-full` on the menu has to mean the bar's edge, and only a
 * full-height wrapper puts the trigger's box there. The row's own height is
 * fixed at 100px, so the two flanks growing to fill it moves nothing.
 *
 * Both of its copies sit inside a `<Suspense>` boundary, with the bare trigger
 * as the fallback. The switcher reads the address it is on — that is what lets
 * a row point at *this* page in another language — and on a route with dynamic
 * segments the framework cannot resolve a pathname while prerendering, so the
 * read suspends. The boundary keeps that suspension from reaching the bar
 * around it; the fallback is the same trigger at the same size, so a static
 * shell looks like the page it becomes.
 *
 * The currency switcher is the other half of that pair, and it is the one thing
 * here this component does not render for itself: it arrives as `navCurrency`
 * and `barCurrency`, already rendered, because the currency comes from a cookie
 * and a cookie cannot be read in a client module. The boundary around *its*
 * read, its fallback, and the classes that seat it in either place all travel
 * with it — see the two props below and `app/[lang]/layout.tsx`.
 */
export function SiteHeader({
  nav,
  messages,
  locale,
  navCurrency,
  barCurrency,
}: {
  /** The seven routes, labelled and addressed for this locale. */
  nav: readonly { label: string; href: string; prefetch: boolean }[];
  /** This locale's `header` slice of the catalog. */
  messages: Messages["header"];
  locale: Locale;
  /**
   * The currency control, in the two seats it takes: the nav's copy and the
   * bar's.
   *
   * Elements rather than the data they are drawn from, and that is the whole
   * shape of the thing. Which currency a price is written in comes from a
   * cookie, and a cookie can only be read on the server — so the control is a
   * Server Component with a `<Suspense>` boundary around its read, which this
   * module cannot be the parent of: a client module may not import a server
   * one. `app/[lang]/layout.tsx` renders both and hands them over already
   * rendered, which is how a Server Component reaches a client one at all.
   *
   * They arrive as two because the two seats differ: the nav's copy is held
   * back to `lg` and the bar's shows below it, exactly as the language
   * switcher's two copies do. The classes that do that live with the control,
   * in `currency-switcher.tsx`.
   */
  navCurrency: ReactNode;
  barCurrency: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    // Mirrors `--breakpoint-bar` in globals.css, which is what every `bar:`
    // utility below compiles to. If the two drift, the panel survives a resize
    // into a bar that already shows the same links.
    const mql = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    mql.addEventListener("change", closeOnDesktop);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      mql.removeEventListener("change", closeOnDesktop);
    };
  }, [menuOpen]);

  return (
    // `relative` anchors the panel to the header rather than the page.
    <header className="relative bg-paper">
      {/*
        The design's container is a 1fr / auto / 1fr grid: the nav column is
        auto-sized and the two flanks are equal, which is what centres it.

        Below `bar` that grid has two items to place rather than three, because
        the nav it would sit between is `display:none` — and a display:none
        element is not a grid item at all. Left at three columns the actions
        would auto-place into the middle one, floating mid-header with the
        third column empty beside them, so the row drops to two columns and
        the actions take the right-hand one, which is where they sit at `bar`.
      */}
      <div className="container-content grid h-[100px] grid-cols-[1fr_auto] items-center bar:grid-cols-[1fr_auto_1fr]">
        <Link
          href={localePath(locale, "/")}
          className="text-[25px] font-bold leading-[37.5px] tracking-[0.14px] text-ink"
        >
          {messages.brand}
        </Link>

        <nav className="hidden h-full items-center bar:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={item.prefetch}
              className="px-[8px] text-[13px] font-bold leading-[16.9px] tracking-[-0.076px] whitespace-nowrap text-ink wide:px-[12.5px]"
            >
              {item.label}
            </Link>
          ))}

          {/*
            The switchers leave the nav between `bar` and `lg` — the 144px they
            cost is what the nav cannot spare while the wordmark and the
            actions cluster are both on the row. They are not lost: the pair
            below carries the same two controls, and is what shows at that
            width. From `lg` the nav is wide enough to hold them again, and the
            bar's pair hides, so exactly one pair is ever displayed.
          */}
          <Suspense fallback={<LanguageTrigger locale={locale} placement="nav" />}>
            <LanguageSwitcher
              locale={locale}
              messages={messages}
              placement="nav"
            />
          </Suspense>

          {navCurrency}
        </nav>

        <div className="flex h-full items-center justify-end">
          {/*
            Both switchers appear twice in this header — here and in the nav
            above — because each is the only control for its setting, and
            inside the collapsed panel they would sit behind a tap. The pairs
            are complementary rather than duplicated: these hide at `lg`, and
            the nav's hide below it, so exactly one pair is displayed at any
            width. Note that the two pairs do NOT split at `bar` with the rest
            of the nav: between `bar` and `lg` the nav is on screen but too
            narrow to hold its own pair, so this one is what shows there.

            Below `sm` they shed the nav copy's 12.5px side padding and a point
            of type size, which is 41px off the pair — and 41px is what stands
            between the wordmark holding one line at 375px and breaking over
            two. Each control's half of that lives with its own trigger classes
            — `language-switcher.tsx` and `currency-switcher.tsx` — which is
            also where each menu hangs from.
          */}
          <Suspense fallback={<LanguageTrigger locale={locale} placement="bar" />}>
            <LanguageSwitcher
              locale={locale}
              messages={messages}
              placement="bar"
            />
          </Suspense>

          {barCurrency}

          <Link
            href={localePath(locale, "/cart")}
            className="flex items-center gap-2 pl-2.5"
          >
            {/*
              The amount is the cheapest thing in the row to give up, so it is
              part of what pays for the nav staying in the bar: gone from
              `bar` to `wide`, back above it. Keeping it would put the row
              11.23px over what 768 offers even with the links tightened, and
              74.23px over at the design's spacing. Below `bar` the cart is
              icon-only for the older reason too — there the wordmark has to
              hold one line in the 126px it needs, and the amount would push
              "Smart Mall" over two.

              The amount itself is a placeholder until the cart exists (Phase
              2): zero, in the shop's currency, formatted for the language the
              page is being read in — `0,00 $` under `/de` rather than `$0.00`.
              The shop's currency rather than the reader's, deliberately: the
              currency switcher beside it is about what a shopper is quoted,
              and this is a cart that does not exist yet, so converting zero
              would buy a second cookie read and a second Suspense boundary
              for nothing. It converts when the cart does.
            */}
            <span className="hidden text-[13px] font-semibold leading-[21.45px] tracking-[-0.076px] text-ink wide:inline">
              {formatMoney(CART_PLACEHOLDER, locale)}
            </span>
            <Image src="/icons/cart.svg" alt={messages.cart} width={15} height={14} />
          </Link>

          {/*
            Last in the row so the cart keeps its place next to the price.
            The only display utility here is `bar:hidden`: the button has to be
            visible below `bar` and gone from `bar` up, which is what the media
            query alone expresses. Pairing it with a base `hidden` reads like
            "hidden only below bar" but compiles to `display: none` at every
            width, leaving the collapsed nav with no way in.
          */}
          <button
            type="button"
            aria-label={menuOpen ? messages.closeMenu : messages.openMenu}
            aria-expanded={menuOpen}
            aria-controls={panelId}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center pl-3 bar:hidden"
          >
            <Image src="/icons/menu.svg" alt="" width={16} height={12} />
          </button>
        </div>
      </div>

      {/*
        Absolutely positioned so opening the menu never shifts the page. The
        panel duplicates the links rather than reusing the block above it,
        because the two want different type, spacing and tap targets; a shared
        list would have to fight both. The visible one is `bar:flex` only, so
        the duplicate is never read twice or tabbed twice.

        The two switchers are deliberately not repeated here: they live in the
        bar, which stays on screen while this panel is open, so a copy here
        would be a second set of the same two controls visible at once.
      */}
      <nav
        id={panelId}
        aria-label={messages.mobileNav}
        className={`absolute inset-x-0 top-full z-50 flex-col border-b border-line bg-paper px-6 pt-2 pb-4 shadow-md bar:hidden ${
          menuOpen ? "flex" : "hidden"
        }`}
      >
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={item.prefetch}
            onClick={() => setMenuOpen(false)}
            className="py-3 text-[15px] font-bold leading-[24.75px] tracking-[-0.234px] text-ink"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

/**
 * The cart's balance, until there is a cart.
 *
 * Zero, in the shop's currency. It exists as a value rather than as the string
 * "$0.00" because money is formatted for the language being read: a German
 * page writes the same amount as `0,00 $`, and a hardcoded string cannot.
 */
const CART_PLACEHOLDER: Money = { amount: "0", currency: "USD" };
