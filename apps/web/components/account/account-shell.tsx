import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/[lang]/account/actions";
import type { Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/languages";

/**
 * The My account page's frame: the 30px title on the 1290 column, 60px above
 * and below, 40px between the title and what follows (Figma 178:5780).
 *
 * `wash` is the signed-out page's #FAFBFC (178:2691). The signed-in frames —
 * Dashboard and Orders — are drawn on the page's own white, and their white
 * sidebar only reads as a panel because of the dividers inside it.
 */
export function AccountFrame({
  title,
  wash,
  children,
}: {
  title: string;
  wash: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wash ? "bg-wash" : "bg-paper"}>
      <div className="container-content pt-[60px] pb-[60px]">
        <h1 className="text-[30px] leading-[45px] font-bold tracking-[0.396px] text-ink">{title}</h1>
        <div className="pt-[40px]">{children}</div>
      </div>
    </div>
  );
}

export type AccountTab = "dashboard" | "orders" | "addresses";

/**
 * A signed-in tab: the sidebar (Figma 178:5789) and the tab beside it.
 *
 * The design's sidebar has five rows. One of them — Account details, the
 * password and email change — is not here yet, because it has no page behind
 * it: a row that 404s is worse than a row that is missing, and it goes in
 * with its page.
 *
 * Each row carries a 35px slot before its label. In the design that is a
 * glyph from WooCommerce's icon font, which the Figma file does not have, so
 * it is drawn empty there — and kept empty here, so the labels sit where the
 * design puts them.
 *
 * Side by side from `bar`. Between `bar` and `lg` the sidebar gives up 68px
 * of its width (288 → 220, the labels still fit with room) so that the orders
 * table beside it has 500px rather than 432 at a 768 window — the difference
 * between its rows holding one line and wrapping to two. Below `bar` the
 * sidebar sits on top, full width.
 */
export function AccountShell({
  active,
  locale,
  messages,
  children,
}: {
  active: AccountTab;
  locale: Locale;
  messages: Messages["account"];
  children: ReactNode;
}) {
  const tabs: { key: AccountTab; label: string; href: string }[] = [
    { key: "dashboard", label: messages.dashboard, href: localePath(locale, "/account") },
    { key: "orders", label: messages.orders, href: localePath(locale, "/account/orders") },
    { key: "addresses", label: messages.addresses, href: localePath(locale, "/account/addresses") },
  ];

  return (
    <div className="flex flex-col gap-[30px] bar:flex-row bar:gap-0">
      <div className="shrink-0 bar:w-[220px] bar:pr-[24px] lg:w-[288px] lg:pr-[30px]">
        <nav aria-label={messages.menu} className="overflow-hidden rounded-[5px] bg-paper">
          <ul>
            {tabs.map((tab) => (
              <li key={tab.key} className="border-b-[0.91px] border-black/5">
                <Link
                  href={tab.href}
                  aria-current={tab.key === active ? "page" : undefined}
                  className={`${ROW} ${tab.key === active ? "bg-ink text-paper" : "text-ink"}`}
                >
                  {tab.label}
                </Link>
              </li>
            ))}
            <li>
              {/* A form post, never a link — see `logoutAction`. */}
              <form action={logoutAction}>
                <input type="hidden" name="locale" value={locale} />
                <button type="submit" className={`${ROW} w-full text-left text-ink`}>
                  {messages.logOut}
                </button>
              </form>
            </li>
          </ul>
        </nav>
      </div>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** 55px rows, 20px in plus the 35px icon slot, 15px medium type. */
const ROW =
  "flex h-[55px] items-center pr-[20px] pl-[55px] text-[15px] leading-[24.75px] font-medium tracking-[-0.234px]";
