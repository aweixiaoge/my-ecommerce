"use client";

import { useActionState } from "react";
import { login } from "./actions";

/**
 * The admin sign-in form.
 *
 * A Client Component because `useActionState` is the only thing that carries
 * the server's validation result back into the markup. The page around it
 * stays a Server Component, so the form is the whole of what ships to the
 * browser.
 *
 * Built on the shared design tokens (`bg-paper`, `text-ink`, `border-line`,
 * `rounded-control`) rather than the storefront's ad-hoc `neutral-*` values.
 */
export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);

  const nameErrors = state?.errors?.name;
  const passwordErrors = state?.errors?.password;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/*
        `aria-live="polite"` rather than a toast: a failed sign-in is the
        result of an action the person just took, and it has to be announced,
        not merely shown.
      */}
      {state?.message && (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-control border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] leading-[21.45px] text-red-700"
        >
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label
          htmlFor="name"
          className="text-[13px] font-bold leading-[16.9px] tracking-[-0.076px] text-ink"
        >
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="username"
          autoFocus
          aria-invalid={nameErrors ? true : undefined}
          aria-describedby={nameErrors ? "name-error" : undefined}
          className={`h-[44px] rounded-control border bg-paper px-3 text-[14px] text-ink transition-colors outline-none focus:ring-2 ${
            nameErrors
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/15"
              : "border-line focus:border-ink focus:ring-ink/15"
          }`}
        />
        {nameErrors && (
          <p
            id="name-error"
            className="text-[12px] leading-[19.8px] text-red-600"
          >
            {nameErrors.join(" ")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="text-[13px] font-bold leading-[16.9px] tracking-[-0.076px] text-ink"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={passwordErrors ? true : undefined}
          aria-describedby={passwordErrors ? "password-error" : undefined}
          className={`h-[44px] rounded-control border bg-paper px-3 text-[14px] text-ink transition-colors outline-none focus:ring-2 ${
            passwordErrors
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/15"
              : "border-line focus:border-ink focus:ring-ink/15"
          }`}
        />
        {passwordErrors && (
          <p
            id="password-error"
            className="text-[12px] leading-[19.8px] text-red-600"
          >
            {passwordErrors.join(" ")}
          </p>
        )}
      </div>

      {/*
        Only the label changes while pending. Swapping in a spinner would make
        the button jump, and the text is already announced by the button.
      */}
      <button
        type="submit"
        disabled={pending}
        className="h-[44px] rounded-control bg-ink text-[14px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
