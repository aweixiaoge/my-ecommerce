"use client";

import { useActionState, useState } from "react";
import { saveAddressAction } from "@/app/[lang]/account/actions";
import {
  AddressFields,
  blankAddress,
  type AddressState,
  type CheckoutCountry,
} from "@/components/checkout/address-fields";
import type { AddressKind } from "@/lib/account/addresses-repo";
import type { Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/languages";
import { AccountButton, FormMessage } from "./fields";

/**
 * Editing one saved address.
 *
 * The design draws the address book but not this form, so it is the
 * checkout's address block (178:7920) — the boxes an address is already typed
 * into on this site — under the card's own heading, with the account's
 * button. Controlled, for the checkout's reason: a refused save must keep
 * what was typed.
 */
export function AddressForm({
  kind,
  title,
  initial,
  defaultCountry,
  countries,
  locale,
  messages,
  checkoutMessages,
}: {
  kind: AddressKind;
  title: string;
  /** The saved address, or null to start a new one. */
  initial: AddressState | null;
  defaultCountry: string;
  countries: CheckoutCountry[];
  locale: Locale;
  messages: Messages["account"];
  checkoutMessages: Messages["checkout"];
}) {
  const [state, formAction, pending] = useActionState(saveAddressAction, undefined);
  const [value, setValue] = useState(() => initial ?? blankAddress(defaultCountry));

  return (
    <form action={formAction} noValidate className="text-ink">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="kind" value={kind} />

      <h2 className="pb-[24px] font-display text-[24px] leading-[32px] font-normal">{title}</h2>

      <FormMessage message={state?.message} />

      <AddressFields
        prefix={kind}
        value={value}
        onChange={setValue}
        countries={countries}
        errors={state?.errors ?? {}}
        messages={checkoutMessages}
      />

      <div className="pt-[24px]">
        <AccountButton pending={pending}>
          {pending ? messages.addressBook.saving : messages.addressBook.save}
        </AccountButton>
      </div>
    </form>
  );
}
