"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/[lang]/account/actions";
import type { Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/languages";
import { AccountButton, AccountField, FormMessage } from "./fields";

/**
 * The "Login" column (Figma 178:2768).
 *
 * The design labels the first box "Username or email address", WooCommerce's
 * wording. Accounts here have no username — the register form asks for an
 * email and nothing else — so the label says what the box takes.
 *
 * "Lost your password?" is not drawn: a reset needs an email to send, and
 * there is no mail yet. A link to a page that cannot do it would be worse
 * than no link.
 */
export function LoginForm({ locale, messages }: { locale: Locale; messages: Messages["account"] }) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} noValidate className="pt-[20px]">
      <input type="hidden" name="locale" value={locale} />

      <FormMessage message={state?.message} />

      <AccountField
        id="account-login-email"
        name="email"
        type="email"
        label={messages.email}
        requiredLabel={messages.required}
        autoComplete="username"
        defaultValue={state?.email}
        error={state?.errors?.email}
      />

      <div className="pt-[24px]">
        <AccountField
          id="account-login-password"
          name="password"
          type="password"
          label={messages.password}
          requiredLabel={messages.required}
          autoComplete="current-password"
          showLabel={messages.showPassword}
          hideLabel={messages.hidePassword}
          error={state?.errors?.password}
        />
      </div>

      <div className="pt-[24px]">
        <label className="flex w-fit cursor-pointer items-center gap-[15px] pb-[21px] text-[14px] leading-[23.1px] font-medium tracking-[-0.15px] text-ink">
          <span className="relative flex size-[16px] shrink-0">
            <input
              type="checkbox"
              name="remember"
              className="peer size-[16px] cursor-pointer appearance-none rounded-[3px] border-[0.91px] border-line bg-paper checked:border-ink checked:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            />
            <svg
              aria-hidden
              viewBox="0 0 12 12"
              className="pointer-events-none absolute inset-[3px] hidden text-paper peer-checked:block"
            >
              <path d="M2 6.5 4.75 9 10 3" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          {messages.remember}
        </label>

        <AccountButton pending={pending}>{pending ? messages.loggingIn : messages.logIn}</AccountButton>
      </div>
    </form>
  );
}
