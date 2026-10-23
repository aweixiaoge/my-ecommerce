"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ACCOUNT_PASSWORD_MIN,
  AccountLoginSchema,
  AccountRegisterSchema,
  AddressSchema,
} from "@my-ecommerce/shared";
import {
  authenticateCustomer,
  closeSession,
  openSession,
  registerCustomer,
  sessionCustomer,
} from "@/lib/account/account-repo";
import { isAddressKind, saveAddress } from "@/lib/account/addresses-repo";
import { ACCOUNT_COOKIE, sessionCookieOptions } from "@/lib/account/session-token";
import { addressProblems } from "@/lib/checkout/countries";
import { fill } from "@/lib/i18n/format";
import { getMessages, type Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import { hasLocale, type Locale } from "@/lib/languages";
import { DEFAULT_LOCALE } from "@/lib/locale";

/**
 * What "Log in", "Register" and "Log out" do on the My account page.
 *
 * Thin, like the checkout's action: the shapes are the shared schemas', the
 * decisions are `lib/account/account-repo.ts`'s. What this adds is the
 * request — the form, the cookie, the sentences, and the way back to the page.
 *
 * Server Actions can be posted to directly, so each one re-derives everything
 * from `formData` and trusts nothing else.
 */

export interface AccountFormState {
  /** Field errors by the field's name in the form. */
  errors?: Record<string, string>;
  /** A sentence for the whole form: wrong credentials, a taken address, a failure. */
  message?: string;
  /** What was typed into the email box, so a refusal does not empty it. */
  email?: string;
}

export async function loginAction(
  _prevState: AccountFormState | undefined,
  formData: FormData,
): Promise<AccountFormState> {
  const locale = submittedLocale(formData.get("locale"));
  const messages = getMessages(locale).account.errors;
  const email = text(formData, "email");

  const parsed = AccountLoginSchema.safeParse({
    email,
    password: text(formData, "password"),
    remember: formData.get("remember") === "on",
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error.issues, messages, "login"), email };
  }

  let token: string;
  try {
    const customer = await authenticateCustomer(parsed.data);
    // One sentence for an unknown address and a wrong password, so the form is
    // no way to find out who has an account.
    if (!customer) return { message: messages.invalid, email };

    ({ token } = await openSession(customer.id, parsed.data.remember));
  } catch (error) {
    console.error("Logging in failed:", error);
    return { message: messages.failed, email };
  }

  return signIn(token, parsed.data.remember, locale);
}

export async function registerAction(
  _prevState: AccountFormState | undefined,
  formData: FormData,
): Promise<AccountFormState> {
  const locale = submittedLocale(formData.get("locale"));
  const messages = getMessages(locale).account.errors;
  const email = text(formData, "email");

  const parsed = AccountRegisterSchema.safeParse({
    email,
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error.issues, messages, "register"), email };
  }

  let token: string;
  try {
    const result = await registerCustomer(parsed.data, locale);
    if (result.status === "taken") return { message: messages.taken, email };

    // A new account is signed in straight away, as a browser session: nobody
    // was asked to be remembered.
    ({ token } = await openSession(result.customer.id, false));
  } catch (error) {
    console.error("Registering failed:", error);
    return { message: messages.failed, email };
  }

  return signIn(token, false, locale);
}

/**
 * Sign-out. A form post rather than a link, for the admin's reason: a GET that
 * signs you out can be fired by any image tag on any page.
 */
export async function logoutAction(formData: FormData): Promise<void> {
  const locale = submittedLocale(formData.get("locale"));
  const jar = await cookies();

  try {
    await closeSession(jar.get(ACCOUNT_COOKIE)?.value);
  } catch (error) {
    // The cookie still goes below. A row that outlives it is one nobody holds
    // the token for any more, and it expires on its own.
    console.error("Closing a session failed:", error);
  }

  jar.delete(ACCOUNT_COOKIE);
  refresh();
  redirect(localePath(locale, "/account"));
}

/**
 * "Save address" on My account → Addresses → Edit.
 *
 * The fields are named as the checkout names them — `billing.firstName`,
 * `shipping.region` — because the form is the checkout's address block, and
 * they are held to the checkout's rules: the shared shape, then the shop's
 * own (`addressProblems`), so a saved address is always one checkout would
 * accept. The words are the checkout's too.
 *
 * Whose address it is comes from the session cookie and nothing else. A
 * signed-out post is sent to log in, and saves nothing.
 */
export async function saveAddressAction(
  _prevState: AccountFormState | undefined,
  formData: FormData,
): Promise<AccountFormState> {
  const locale = submittedLocale(formData.get("locale"));
  const messages = getMessages(locale).checkout.errors;
  const kind = text(formData, "kind") ?? "";

  const customer = await sessionCustomer((await cookies()).get(ACCOUNT_COOKIE)?.value);
  if (!customer || !isAddressKind(kind)) redirect(localePath(locale, "/account"));

  const field = (name: string) => text(formData, `${kind}.${name}`);
  const given = {
    countryCode: field("countryCode"),
    firstName: field("firstName"),
    lastName: field("lastName"),
    line1: field("line1"),
    line2: field("line2"),
    city: field("city"),
    region: field("region"),
    postalCode: field("postalCode"),
    phone: field("phone"),
  };

  const errors: Record<string, string> = {};
  const parsed = AddressSchema.safeParse(given);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const name = `${kind}.${String(issue.path[0])}`;
      errors[name] ??=
        issue.path[0] === "countryCode"
          ? messages.country
          : issue.code === "too_big"
            ? messages.tooLong
            : messages.required;
    }
  }
  for (const problem of addressProblems({
    countryCode: given.countryCode ?? "",
    region: given.region?.trim() || undefined,
  })) {
    errors[`${kind}.${problem}`] = problem === "countryCode" ? messages.country : messages.region;
  }

  if (!parsed.success || Object.keys(errors).length > 0) {
    return { errors, message: messages.intro };
  }

  try {
    await saveAddress(customer.id, kind, parsed.data);
  } catch (error) {
    console.error("Saving an address failed:", error);
    return { message: getMessages(locale).account.errors.failed };
  }

  redirect(localePath(locale, "/account/addresses"));
}

/**
 * The cookie, then the page again — now drawn signed in.
 *
 * Outside every `try`: `redirect` works by throwing, and a catch around it
 * would report a successful sign-in as a failure.
 */
async function signIn(token: string, remember: boolean, locale: Locale): Promise<never> {
  (await cookies()).set(ACCOUNT_COOKIE, token, sessionCookieOptions(remember));
  refresh();
  redirect(localePath(locale, "/account"));
}

/** The language the form was drawn in, or the default for a tampered one. */
function submittedLocale(raw: FormDataEntryValue | null): Locale {
  const value = typeof raw === "string" ? raw : "";
  return hasLocale(value) ? value : DEFAULT_LOCALE;
}

function text(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

/** The first refusal per field, as a sentence in the form's language. */
function fieldErrors(
  issues: readonly { code: string; path: readonly PropertyKey[] }[],
  messages: Messages["account"]["errors"],
  form: "login" | "register",
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of issues) {
    const field = String(issue.path[0]);
    errors[field] ??= messageFor(field, issue.code, messages, form);
  }

  return errors;
}

function messageFor(
  field: string,
  code: string,
  messages: Messages["account"]["errors"],
  form: "login" | "register",
): string {
  if (code === "too_big") return messages.tooLong;
  if (field === "email") return messages.email;
  if (field === "confirmPassword") return messages.mismatch;
  // Only registering has a length rule. Logging in has a floor of one
  // character, so "too short" there means the box was left empty.
  if (form === "register") {
    return fill(messages.passwordShort, { min: String(ACCOUNT_PASSWORD_MIN) });
  }
  return messages.password;
}
