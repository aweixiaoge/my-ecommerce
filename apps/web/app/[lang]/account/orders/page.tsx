import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountOrders } from "@/components/account/account-orders";
import { AccountFrame, AccountShell } from "@/components/account/account-shell";
import { customerOrders } from "@/lib/account/orders-repo";
import { requestCustomer } from "@/lib/account/request";
import { getMessages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import { requestLocale } from "@/lib/i18n/request";
import type { Locale } from "@/lib/languages";

export async function generateMetadata(): Promise<Metadata> {
  const messages = getMessages(await requestLocale()).account;

  return {
    title: `${messages.orders} · ${messages.title}`,
    robots: { index: false },
  };
}

/**
 * My account → Orders (Figma 178:7454): the signed-in customer's orders,
 * newest first.
 *
 * Signed out, there is nobody's history to show, so the address sends the
 * reader to My account to log in. Unlike the account page itself, the
 * fallback is the signed-in frame: anyone arriving here followed the
 * sidebar, and is signed in.
 */
export default async function AccountOrdersPage() {
  const locale = await requestLocale();
  const messages = getMessages(locale).account;

  return (
    <Suspense
      fallback={
        <AccountFrame title={messages.title} wash={false}>
          <div aria-hidden className="h-[330px] animate-pulse bg-mist" />
        </AccountFrame>
      }
    >
      <OrdersContents locale={locale} />
    </Suspense>
  );
}

async function OrdersContents({ locale }: { locale: Locale }) {
  const messages = getMessages(locale).account;
  const customer = await requestCustomer();
  if (!customer) redirect(localePath(locale, "/account"));

  const orders = await customerOrders(customer.id);

  return (
    <AccountFrame title={messages.title} wash={false}>
      <AccountShell active="orders" locale={locale} messages={messages}>
        <AccountOrders orders={orders} locale={locale} messages={messages} />
      </AccountShell>
    </AccountFrame>
  );
}
