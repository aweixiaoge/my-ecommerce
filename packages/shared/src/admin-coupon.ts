import { z } from "zod";

/**
 * The admin's coupon-create payload, and the code generator behind the form's
 * "Generate code" button.
 *
 * Shared rather than kept in the web app for the reason the other admin
 * schemas are: it is the contract a future API validates against too. The
 * error copy is not here — UI strings are the form action's business.
 */

/**
 * The letters a generated code is drawn from: no 0/O or 1/I, which look
 * alike when a code is read off a receipt or a poster. 32 symbols, so a random
 * byte masked to five bits picks one without bias.
 */
export const COUPON_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Long enough that guessing one is not a strategy: 32^10 ≈ 10^15. */
export const GENERATED_COUPON_CODE_LENGTH = 10;

export const COUPON_CODE_MIN = 3;
export const COUPON_CODE_MAX = 32;

/** A code a person can type: letters, digits, `-` and `_`, stored upper-cased. */
const COUPON_CODE_PATTERN = /^[A-Z0-9_-]+$/;

/**
 * A random coupon code.
 *
 * `fill` is `crypto.getRandomValues` in the browser and on the server alike;
 * it is a parameter so a test can make the output predictable.
 */
export function generateCouponCode(
  fill: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes),
): string {
  const bytes = fill(new Uint8Array(GENERATED_COUPON_CODE_LENGTH));
  let code = "";

  for (const byte of bytes) {
    // `& 31` keeps five bits — exactly the alphabet's 32 entries.
    code += COUPON_CODE_ALPHABET[byte & 31];
  }

  return code;
}

export const CouponTypeSchema = z.enum(["fixed_amount", "percentage"]);
export type CouponType = z.infer<typeof CouponTypeSchema>;

/**
 * The create payload, checked against `now` — an expiry in the past would make
 * a coupon that is dead on arrival.
 *
 * A factory rather than a constant so the clock is an argument: the schema
 * stays a pure function of its inputs, and a test does not have to freeze time.
 */
export function adminCouponCreateSchema(now: Date) {
  return z
    .object({
      code: z
        .string()
        .trim()
        .toUpperCase()
        .min(COUPON_CODE_MIN)
        .max(COUPON_CODE_MAX)
        .regex(COUPON_CODE_PATTERN),
      type: CouponTypeSchema,
      // A decimal string, never a float (`money.ts`): at most two places, and
      // more than nothing — a zero discount is not a coupon.
      amount: z
        .string()
        .trim()
        .regex(/^\d+(\.\d{1,2})?$/)
        .refine((value) => Number(value) > 0, { message: "not_positive" }),
      appliesToAllProducts: z.boolean(),
      productIds: z.array(z.string().min(1)).transform((ids) => [...new Set(ids)]),
      expiresAt: z.iso
        .datetime({ offset: true })
        .refine((value) => new Date(value).getTime() > now.getTime(), {
          message: "in_past",
        }),
    })
    .superRefine((coupon, ctx) => {
      if (coupon.type === "percentage" && Number(coupon.amount) > 100) {
        ctx.addIssue({ code: "custom", path: ["amount"], message: "over_100" });
      }
      if (!coupon.appliesToAllProducts && coupon.productIds.length === 0) {
        ctx.addIssue({ code: "custom", path: ["productIds"], message: "none_selected" });
      }
    })
    .transform((coupon) => ({
      ...coupon,
      // "All products" makes a selection meaningless; dropping it here means a
      // stale list of checked boxes can never be stored beside the flag.
      productIds: coupon.appliesToAllProducts ? [] : coupon.productIds,
    }));
}

export type AdminCouponCreate = z.infer<ReturnType<typeof adminCouponCreateSchema>>;
