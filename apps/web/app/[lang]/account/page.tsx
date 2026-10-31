import { Suspense } from "react";
import type { Metadata } from "next";
import { AccountDashboard } from "@/components/account/account-dashboard";
import { AccountFrame, AccountShell } from "@/components/account/account-shell";
import { LoginForm } from "@/components/account/login-form";
import { RegisterForm } from "@/components/account/register-form";
import { requestCustomer } from "@/lib/account/request";
import { getMessages } from "@/lib/i18n/messages";
import { requestLocale } from "@/lib/i18n/request";
import type { Locale } from "@/lib/languages";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: getMessages(await requestLocale()).account.title,
    // A sign-in form and one customer's account: nothing for an index.
    robots: { index: false },
  };
}

/**
 * My account — where the header's "My account" goes.
 *
 * Signed out, it is Login and Register (Figma 178:2691). Signed in, it is the
 * Dashboard tab (178:5779), and logging in or registering lands there because
 * both actions come back to this address.
 *
 * Everything streams, because which of the two it is depends on a cookie,
 * and with Cache Components a cookie read outside `<Suspense>` is a route
 * that cannot be prerendered. The two are drawn on different backgrounds, so
 * the fallback takes the signed-out one — the page most people reach here
 * see — and a signed-in reader sees the wash give way to white once.
 */
export default async function AccountPage() {
  const locale = await requestLocale();
  const messages = getMessages(locale).account;

  return (
    <Suspense
      fallback={
        <AccountFrame title={messages.title} wash>
          <div aria-hidden className="grid animate-pulse grid-cols-1 gap-[48px] bar:grid-cols-2 bar:gap-[80px]">
            <div className="h-[370px] bg-mist" />
            <div className="h-[330px] bg-mist" />
          </div>
        </AccountFrame>
      }
    >
      <AccountContents locale={locale} />
    </Suspense>
  );
}

async function AccountContents({ locale }: { locale: Locale }) {
  const messages = getMessages(locale).account;
  const customer = await requestCustomer();

  if (customer) {
    return (
      <AccountFrame title={messages.title} wash={false}>
        <AccountShell active="dashboard" locale={locale} messages={messages}>
          <AccountDashboard email={customer.email} locale={locale} messages={messages} />
        </AccountShell>
      </AccountFrame>
    );
  }

  /*
    The columns stack below `bar` (768px), the storefront's line between a
    narrow window and a desktop one — at 768 each still has 320px of box,
    which is room for an email address.
  */
  return (
    <AccountFrame title={messages.title} wash>
      <div className="grid grid-cols-1 gap-y-[48px] bar:grid-cols-2">
        {/*
          The divider is the Login column's own right edge — a solid hairline
          rather than the design's dash — so it runs exactly as tall
          as the taller of the two columns. Stacked, it would be a vertical
          rule beside nothing, so it only appears once the columns sit side by
          side.
        */}
        <section className="bar:border-r bar:border-line bar:pr-[56px]">
          <h2 className={HEADING}>{messages.login}</h2>
          <LoginForm locale={locale} messages={messages} />
        </section>

        <section className="bar:pl-[56px]">
          <h2 className={HEADING}>{messages.register}</h2>
          <RegisterForm locale={locale} messages={messages} />
        </section>
      </div>
    </AccountFrame>
  );
}

const HEADING = "font-display text-[26px] leading-[34px] font-normal text-ink";
