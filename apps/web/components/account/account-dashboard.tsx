import Link from "next/link";
import { Fragment } from "react";
import { logoutAction } from "@/app/[lang]/account/actions";
import { fillParts } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/languages";

/**
 * The Dashboard tab (Figma 178:5830): who is signed in, a way out, and where
 * to go from here.
 *
 * The design's second sentence also links "your password and account
 * details". That tab is not built (see `AccountShell`), so the sentence names
 * only what can be followed — the catalog's `intro` is written that way in
 * every language, rather than the page cutting a longer sentence apart.
 *
 * The inline "Log out" is a button in a form, styled as the design's
 * underlined link: signing out is a POST, and the form wraps the whole
 * paragraph because a form cannot sit inside a `<p>`.
 */
export function AccountDashboard({
  email,
  locale,
  messages,
}: {
  email: string;
  locale: Locale;
  messages: Messages["account"];
}) {
  return (
    <div className="text-[16px] leading-[26.4px] tracking-[-0.3125px] text-ink">
      <form action={logoutAction} className="pt-[48px]">
        <input type="hidden" name="locale" value={locale} />
        <p>
          {fillParts(messages.hello, {
            email: <strong className="font-bold">{email}</strong>,
            logOut: (
              <button type="submit" className="underline underline-offset-2">
                {messages.logOut}
              </button>
            ),
          }).map((part, index) => (
            <Fragment key={index}>{part}</Fragment>
          ))}
        </p>
      </form>

      <p className="py-[24px]">
        {fillParts(messages.intro, {
          orders: (
            <Link href={localePath(locale, "/account/orders")} className="underline underline-offset-2">
              {messages.introOrders}
            </Link>
          ),
          addresses: (
            <Link href={localePath(locale, "/account/addresses")} className="underline underline-offset-2">
              {messages.introAddresses}
            </Link>
          ),
        }).map((part, index) => (
          <Fragment key={index}>{part}</Fragment>
        ))}
      </p>
    </div>
  );
}

