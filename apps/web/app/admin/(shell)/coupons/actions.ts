"use server";

import { adminCouponCreateSchema } from "@my-ecommerce/shared";
import { redirect } from "next/navigation";
import {
  CouponNotFoundError,
  createCoupon,
  DuplicateCouponCodeError,
  UnknownCouponProductError,
  updateCoupon,
} from "@/lib/admin/coupons-repo";
import { getSession } from "@/lib/admin/session";

/**
 * What the coupon screens do.
 *
 * Thin on purpose, like the category actions: the rule is the shared schema's
 * and the query is the repository's. Reachable by direct POST, so the session
 * is checked and the payload re-derived from `formData` before anything is
 * written.
 */

type CouponField = "code" | "type" | "amount" | "productIds" | "expiresAt";

export interface CouponFormState {
  errors?: Partial<Record<CouponField, string[]>>;
  message?: string;
}

export async function createCouponAction(
  _prevState: CouponFormState | undefined,
  formData: FormData,
): Promise<CouponFormState | undefined> {
  if (!(await getSession())) {
    return { message: "Your session has expired. Sign in again." };
  }

  const parsed = readCouponForm(formData);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error.issues, formData.get("type")) };
  }

  try {
    await createCoupon(parsed.data);
  } catch (error) {
    return saveFailure(error, "Creating");
  }

  // Outside the `try`: `redirect` signals by throwing.
  redirect("/admin/coupons");
}

/**
 * Saves a coupon that already exists: the create form with the coupon's values
 * in it, the same schema, and the id in a hidden field.
 *
 * The expiry is held to the create rule — in the future — since saving a
 * coupon that is already dead is never what was meant; an expired coupon is
 * revived by giving it a new date.
 */
export async function updateCouponAction(
  _prevState: CouponFormState | undefined,
  formData: FormData,
): Promise<CouponFormState | undefined> {
  if (!(await getSession())) {
    return { message: "Your session has expired. Sign in again." };
  }

  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    return { message: "That coupon could not be identified. Reload and try again." };
  }

  const parsed = readCouponForm(formData);

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error.issues, formData.get("type")) };
  }

  try {
    await updateCoupon(id, parsed.data);
  } catch (error) {
    if (error instanceof CouponNotFoundError) {
      return { message: "This coupon no longer exists. It may have been deleted in another tab." };
    }
    return saveFailure(error, "Updating");
  }

  redirect("/admin/coupons");
}

/** The form, through the shared schema. */
function readCouponForm(formData: FormData) {
  return adminCouponCreateSchema(new Date()).safeParse({
    code: formData.get("code") ?? "",
    type: formData.get("type") ?? "",
    amount: formData.get("amount") ?? "",
    appliesToAllProducts: formData.get("appliesTo") !== "selected",
    productIds: formData.getAll("productIds").filter((id) => typeof id === "string"),
    // The form converts the picked local time to an instant before sending,
    // because only the browser knows which timezone the person meant.
    expiresAt: formData.get("expiresAt") ?? "",
  });
}

/** A failed save as the form state that says so. */
function saveFailure(error: unknown, verb: "Creating" | "Updating"): CouponFormState {
  if (error instanceof DuplicateCouponCodeError) {
    return { errors: { code: [error.message] } };
  }
  if (error instanceof UnknownCouponProductError) {
    return { errors: { productIds: [error.message] } };
  }

  console.error(`${verb} a coupon failed:`, error);
  return {
    message:
      "The coupon could not be saved. Try again, and check the server is running if it keeps failing.",
  };
}

/**
 * Validation issues as sentences, keyed by the field they are about.
 *
 * Every path the schema can report has a message here, so no refusal is ever
 * rendered as a submit button that appears to do nothing.
 */
function fieldErrors(
  issues: readonly { path: PropertyKey[]; message: string }[],
  type: FormDataEntryValue | null,
): CouponFormState["errors"] {
  const errors: NonNullable<CouponFormState["errors"]> = {};

  for (const issue of issues) {
    const field = issue.path[0] as CouponField;
    const message = messageFor(field, issue.message, type);
    const list = (errors[field] ??= []);
    if (!list.includes(message)) list.push(message);
  }

  return errors;
}

function messageFor(
  field: CouponField,
  reason: string,
  type: FormDataEntryValue | null,
): string {
  switch (field) {
    case "code":
      return "Use 3–32 letters, digits, dashes or underscores — or generate one.";
    case "type":
      return "Choose a discount type.";
    case "amount":
      if (reason === "over_100") return "A percentage cannot be more than 100.";
      return type === "percentage"
        ? "Enter a percentage greater than 0, e.g. 10."
        : "Enter an amount greater than 0, with at most two decimals, e.g. 5.00.";
    case "productIds":
      return "Select at least one product, or apply the coupon to all products.";
    case "expiresAt":
      return reason === "in_past"
        ? "Choose an expiry date in the future."
        : "Choose an expiry date and time.";
  }
}
