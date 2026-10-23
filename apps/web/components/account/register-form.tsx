"use client";

import { useActionState } from "react";
import { registerAction } from "@/app/[lang]/account/actions";
import type { Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/languages";
import { AccountButton, AccountField, FormMessage } from "./fields";

/**
 * The "Register" column (Figma 178:2804): three boxes 5px apart, straight
 * under the heading — unlike Login, the design gives this form no top
 * padding — then the button 50px below the last box.
 */
export function RegisterForm({ locale, messages }: { locale: Locale; messages: Messages["account"] }) {
  const [state, formAction, pending] = useActionState(registerAction, undefined);

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="locale" value={locale} />

      <FormMessage message={state?.message} />

      <div className="flex flex-col gap-[5px]">
        <AccountField
          id="account-register-email"
          name="email"
          type="email"
          label={messages.email}
          requiredLabel={messages.required}
          autoComplete="email"
          defaultValue={state?.email}
          error={state?.errors?.email}
        />
        <AccountField
          id="account-register-password"
          name="password"
          type="password"
          label={messages.password}
          requiredLabel={messages.required}
          autoComplete="new-password"
          showLabel={messages.showPassword}
          hideLabel={messages.hidePassword}
          error={state?.errors?.password}
        />
        <AccountField
          id="account-register-confirm"
          name="confirmPassword"
          type="password"
          label={messages.confirmPassword}
          requiredLabel={messages.required}
          autoComplete="new-password"
          showLabel={messages.showPassword}
          hideLabel={messages.hidePassword}
          error={state?.errors?.confirmPassword}
        />
      </div>

      <div className="pt-[50px]">
        <AccountButton pending={pending}>
          {pending ? messages.registering : messages.registerButton}
        </AccountButton>
      </div>
    </form>
  );
}
