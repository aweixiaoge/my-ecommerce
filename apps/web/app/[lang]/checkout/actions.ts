"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  CheckoutSchema,
  CouponCodeSchema,
  type Checkout,
  type CouponRefusal,
  type Money,
} from "@my-ecommerce/shared";
import { sessionCustomer } from "@/lib/account/account-repo";
import { ACCOUNT_COOKIE } from "@/lib/account/session-token";
import { getCart } from "@/lib/cart/cart-repo";
import { CART_COOKIE } from "@/lib/cart/cart-token";
import { addressProblems } from "@/lib/checkout/countries";
import { redeemCoupon } from "@/lib/checkout/coupon-repo";
import { placeOrder, type PlaceOrderResult } from "@/lib/checkout/order-repo";
import { requestDisplayCurrency } from "@/lib/currency/request";
import { getMessages, type Messages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/paths";
import { hasLocale, type Locale } from "@/lib/languages";
import { DEFAULT_LOCALE } from "@/lib/locale";

/**
 * What "Place Order" does.
 *
 * Thin on purpose, like the storefront's other actions: the shape is the
 * shared schema's, where the shop ships is `lib/checkout/countries.ts`'s, and
 * the order is the repository's. What this adds is the request — reading the
 * form and the cookie, turning refusals into sentences, and sending a placed
 * order to its confirmation page.
 */

/**
 * What "Apply" said about a coupon code — a status, not a sentence, for the
 * reason the cart's actions give: the form says it in the reader's language.
 *
 * - `applied`: the discount it takes off the cart as it stands. A preview —
 *   "Place Order" judges the coupon again against the cart it orders.
 * - `unknown` / `expired` / `notApplicable`: `CouponRefusal`'s meanings.
 * - `empty`: nothing in the cart can be bought, so there is nothing to discount.
 * - `failed`: the check itself went wrong.
 */
export type ApplyCouponResult =
  | { status: "applied"; code: string; discount: Money }
  | { status: CouponRefusal | "empty" | "failed" };

export async function applyCouponAction(
  locale: string,
  code: string,
): Promise<ApplyCouponResult> {
  const parsed = CouponCodeSchema.safeParse(code);
  // A blank or overlong code is one no coupon has.
  if (!parsed.success) return { status: "unknown" };

  try {
    const token = (await cookies()).get(CART_COOKIE)?.value;
    const cart = token ? await getCart(token, submittedLocale(locale)) : null;
    const lines = cart?.items.filter((item) => item.unavailableReason === null) ?? [];
    if (lines.length === 0) return { status: "empty" };

    return await redeemCoupon(parsed.data, lines);
  } catch (error) {
    console.error("Checking a coupon failed:", error);
    return { status: "failed" };
  }
}

export interface CheckoutFormState {
  /**
   * Field errors by the field's name in the form — `email`,
   * `shipping.firstName`, `billing.region`, `paymentMethod` — so the form
   * can put each under its box without knowing anything about the schema.
   */
  errors?: Record<string, string>;
  /** A sentence for the whole form: the cart emptied, stock ran out, a failure. */
  message?: string;
  /** Set with a `stockChanged` message: the way back to the cart to fix it. */
  reviewCart?: boolean;
  /**
   * Set when the applied coupon was refused at placing: the form drops it, so
   * the total it shows is the one the next "Place Order" would charge.
   */
  couponRefused?: boolean;
}

export async function placeOrderAction(
  _prevState: CheckoutFormState | undefined,
  formData: FormData,
): Promise<CheckoutFormState> {
  const locale = submittedLocale(formData.get("locale"));
  const messages = getMessages(locale).checkout.errors;

  const billingSameAsShipping = formData.get("billingSameAsShipping") === "on";
  const parsed = CheckoutSchema.safeParse({
    idempotencyKey: text(formData, "idempotencyKey"),
    email: text(formData, "email"),
    shipping: address(formData, "shipping"),
    billingSameAsShipping,
    billing: billingSameAsShipping ? undefined : address(formData, "billing"),
    shippingMethod: text(formData, "shippingMethod"),
    paymentMethod: text(formData, "paymentMethod"),
    // The box is only sent while "Add a note" is ticked; untick it, and the
    // note typed before is not part of the order.
    note: formData.get("addNote") === "on" ? text(formData, "note") : undefined,
    // Only ever a code "Apply" accepted; blank is no coupon.
    couponCode: text(formData, "couponCode")?.trim() || undefined,
  });

  const errors: Record<string, string> = {};

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path.join(".");
      errors[field] ??= messageFor(field, issue.code, messages);
    }
  }

  // The shop's own address rules, checked on every submission rather than only
  // once the shape passes — a missing province is reported with the missing
  // name, not one round trip later.
  for (const kind of billingSameAsShipping ? (["shipping"] as const) : (["shipping", "billing"] as const)) {
    const given = address(formData, kind);
    for (const field of addressProblems({
      countryCode: given.countryCode ?? "",
      region: given.region?.trim() || undefined,
    })) {
      errors[`${kind}.${field}`] = field === "countryCode" ? messages.country : messages.region;
    }
  }

  if (!parsed.success || Object.keys(errors).length > 0) {
    // The idempotency key is not a field anyone can fix: a form that lost it
    // is a stale page, and the answer is to try again.
    if (errors.idempotencyKey) return { message: messages.failed };
    return { errors, message: messages.intro };
  }

  let result: PlaceOrderResult;
  try {
    const jar = await cookies();
    const customer = await sessionCustomer(jar.get(ACCOUNT_COOKIE)?.value);
    result = await placeOrder(jar.get(CART_COOKIE)?.value, parsed.data, {
      locale,
      display: await requestDisplayCurrency(),
      customerId: customer?.id ?? null,
    });
  } catch (error) {
    console.error("Placing an order failed:", error);
    return { message: messages.failed };
  }

  if (result.status === "empty") return { message: messages.cartEmpty };
  if (result.status === "stockChanged") {
    return { message: messages.stockChanged, reviewCart: true };
  }
  if (result.status === "couponRefused") {
    return {
      message: messages.couponRefused,
      errors: { couponCode: couponMessage(result.reason, getMessages(locale).checkout.coupon) },
      couponRefused: true,
    };
  }

  // The ordered lines have left the cart, and the header's badge is in a layout
  // the redirect would otherwise reuse as it was.
  refresh();

  // Outside the `try`: `redirect` works by throwing, and a catch-all around it
  // would swallow the navigation and report a placed order as a failure.
  redirect(
    localePath(
      locale,
      `/checkout/order-received/${result.orderNumber}?key=${encodeURIComponent(result.accessKey)}`,
    ),
  );
}

/** The language the form was drawn in, or the default for a tampered one. */
function submittedLocale(raw: FormDataEntryValue | null): Locale {
  const value = typeof raw === "string" ? raw : "";
  return hasLocale(value) ? value : DEFAULT_LOCALE;
}

/** A text field, with a missing one as `undefined` so `.optional()` means it. */
function text(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

/** One address's fields, named `shipping.firstName` and so on in the form. */
function address(formData: FormData, prefix: "shipping" | "billing"): Partial<Checkout["shipping"]> {
  const field = (name: keyof Checkout["shipping"]) => text(formData, `${prefix}.${name}`);

  return {
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
}

/**
 * A refusal as a sentence. The schema says which field and which rule; the
 * words are the catalog's, in the language the form was read in.
 */
function messageFor(
  field: string,
  code: string,
  messages: Messages["checkout"]["errors"],
): string {
  if (field === "paymentMethod") return messages.payment;
  if (field === "couponCode") return messages.couponRefused;
  if (field.endsWith("countryCode")) return messages.country;
  if (field === "email" && code !== "too_big") return messages.email;
  return code === "too_big" ? messages.tooLong : messages.required;
}

/** Why a coupon took nothing off, in the reader's words. */
function couponMessage(
  reason: CouponRefusal,
  messages: Messages["checkout"]["coupon"],
): string {
  return messages[reason];
}
