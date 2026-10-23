"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ADMIN_PASSWORD_MIN_LENGTH } from "@my-ecommerce/shared";
import {
  createAdminUserAction,
  type AdminUserFormState,
} from "@/app/admin/(shell)/users/actions";
import { FieldErrors, inputClass, LABEL } from "./form-controls";

/**
 * The create-user form: a username, a password, and the password again.
 *
 * The name is controlled so a refused save keeps it — React 19 resets the form
 * when its action resolves. The two passwords are not: they are retyped after a
 * refusal, which is what a password form should ask for anyway.
 */
export function AdminUserForm() {
  const [state, formAction, pending] = useActionState<
    AdminUserFormState | undefined,
    FormData
  >(createAdminUserAction, undefined);

  const [name, setName] = useState("");
  const errors = state?.errors;

  return (
    <form action={formAction} className="flex max-w-[640px] flex-col gap-8">
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
        <label htmlFor="name" className={LABEL}>
          Username
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={64}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={errors?.name ? true : undefined}
          aria-describedby={errors?.name ? "name-error" : "name-hint"}
          className={`h-11 ${inputClass(Boolean(errors?.name))}`}
        />
        <p id="name-hint" className="text-[12px] leading-[19.8px] text-ink-55">
          What they type to sign in. Letters, digits, dots, dashes and underscores.
        </p>
        <FieldErrors id="name-error" messages={errors?.name} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className={LABEL}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={ADMIN_PASSWORD_MIN_LENGTH}
          maxLength={200}
          aria-invalid={errors?.password ? true : undefined}
          aria-describedby={errors?.password ? "password-error" : "password-hint"}
          className={`h-11 ${inputClass(Boolean(errors?.password))}`}
        />
        <p id="password-hint" className="text-[12px] leading-[19.8px] text-ink-55">
          At least {ADMIN_PASSWORD_MIN_LENGTH} characters.
        </p>
        <FieldErrors id="password-error" messages={errors?.password} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="confirmPassword" className={LABEL}>
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          maxLength={200}
          aria-invalid={errors?.confirmPassword ? true : undefined}
          aria-describedby={errors?.confirmPassword ? "confirm-password-error" : undefined}
          className={`h-11 ${inputClass(Boolean(errors?.confirmPassword))}`}
        />
        <FieldErrors id="confirm-password-error" messages={errors?.confirmPassword} />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-control bg-ink px-5 text-[14px] font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create user"}
        </button>

        <Link
          href="/admin/users"
          className="flex h-11 items-center rounded-control border border-line px-4 text-[14px] font-medium text-ink transition-colors hover:bg-mist"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
