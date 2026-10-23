import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountAddresses } from "@/components/account/account-addresses";
import { AccountFrame, AccountShell } from "@/components/account/account-shell";
import { customerAddresses } from "@/lib/account/addresses-repo";
import { requestCustomer } from "@/lib/account/request";
import { getMessages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import { requestLocale } from "@/lib/i18n/request";
import type { Locale } from "@/lib/languages";

export async function generateMetadata(): Promise<Metadata> {
  const messages = getMessages(await requestLocale()).account;

  return {
    title: `${messages.addresses} · ${messages.title}`,
    robots: { index: false },
  };
}

/**
 * My account → Addresses (Figma 178:6792). Signed out, it sends the reader to
 * log in, as Orders does; the fallback is the signed-in frame for the same
 * reason Orders gives.
 */
export default async function AccountAddressesPage() {
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
      <AddressesContents locale={locale} />
    </Suspense>
  );
}

async function AddressesContents({ locale }: { locale: Locale }) {
  const messages = getMessages(locale).account;
  const customer = await requestCustomer();
  if (!customer) redirect(localePath(locale, "/account"));

  return (
    <AccountFrame title={messages.title} wash={false}>
      <AccountShell active="addresses" locale={locale} messages={messages}>
        <AccountAddresses book={await customerAddresses(customer.id)} locale={locale} messages={messages} />
      </AccountShell>
    </AccountFrame>
  );
}
