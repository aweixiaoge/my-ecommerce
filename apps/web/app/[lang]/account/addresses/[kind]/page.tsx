import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AccountFrame, AccountShell } from "@/components/account/account-shell";
import { AddressForm } from "@/components/account/address-form";
import { addressFormValues, customerAddresses, isAddressKind } from "@/lib/account/addresses-repo";
import { requestCustomer } from "@/lib/account/request";
import { countryOptions, DEFAULT_COUNTRY, regionsFor } from "@/lib/checkout/countries";
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
 * Editing one saved address: `/account/addresses/billing` or `/shipping` —
 * WooCommerce's `edit-address/<kind>`. Any other segment is a 404, and
 * signed out it sends the reader to log in.
 *
 * The params are runtime data, read inside the boundary for the reason the
 * order-received route gives.
 */
export default async function AccountAddressEditPage(props: PageProps<"/[lang]/account/addresses/[kind]">) {
  const locale = await requestLocale();
  const messages = getMessages(locale).account;

  return (
    <Suspense
      fallback={
        <AccountFrame title={messages.title} wash={false}>
          <div aria-hidden className="h-[420px] animate-pulse bg-mist" />
        </AccountFrame>
      }
    >
      {props.params.then(({ kind }) => (
        <EditContents kind={kind} locale={locale} />
      ))}
    </Suspense>
  );
}

async function EditContents({ kind, locale }: { kind: string; locale: Locale }) {
  if (!isAddressKind(kind)) notFound();

  const all = getMessages(locale);
  const messages = all.account;
  const customer = await requestCustomer();
  if (!customer) redirect(localePath(locale, "/account"));

  const saved = (await customerAddresses(customer.id))[kind];

  return (
    <AccountFrame title={messages.title} wash={false}>
      <AccountShell active="addresses" locale={locale} messages={messages}>
        <AddressForm
          kind={kind}
          title={kind === "billing" ? messages.addressBook.billing : messages.addressBook.shipping}
          initial={saved ? addressFormValues(saved) : null}
          defaultCountry={DEFAULT_COUNTRY}
          countries={countryOptions(locale).map((country) => ({ ...country, regions: regionsFor(country.code) }))}
          locale={locale}
          messages={messages}
          checkoutMessages={all.checkout}
        />
      </AccountShell>
    </AccountFrame>
  );
}
