import { z } from "zod";
import { CouponCodeSchema } from "./coupon";

/**
 * What the checkout form sends.
 *
 * Like the cart, it is intent: an email, two addresses, and which shipping and
 * payment methods. No figure crosses this boundary — the order's prices and
 * totals are computed by the server from the cart at the moment it is placed.
 *
 * Bounds, not policy — sized the way `review.ts` sizes its fields: far above
 * what a person types into each box, and well under what makes a request
 * expensive. Whether a country is one the shop ships to, and whether a region
 * belongs to it, are the storefront's rules (`apps/web/lib/checkout/`), not the
 * shape's.
 */

export const CHECKOUT_NAME_MAX = 80;
export const CHECKOUT_LINE_MAX = 200;
export const CHECKOUT_CITY_MAX = 100;
export const CHECKOUT_POSTAL_MAX = 20;
export const CHECKOUT_PHONE_MAX = 30;
/** plan.md's `customers.email` ceiling, as the review form uses. */
export const CHECKOUT_EMAIL_MAX = 200;
export const CHECKOUT_NOTE_MAX = 1_000;

/** A blank optional box is absent, not an empty string to store. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const AddressSchema = z.object({
  /** ISO 3166-1 alpha-2, upper case. */
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  firstName: z.string().trim().min(1).max(CHECKOUT_NAME_MAX),
  lastName: z.string().trim().min(1).max(CHECKOUT_NAME_MAX),
  line1: z.string().trim().min(1).max(CHECKOUT_LINE_MAX),
  line2: optionalText(CHECKOUT_LINE_MAX),
  city: z.string().trim().min(1).max(CHECKOUT_CITY_MAX),
  /** Province or state. Required for the countries the shop lists them for. */
  region: optionalText(CHECKOUT_CITY_MAX),
  postalCode: z.string().trim().min(1).max(CHECKOUT_POSTAL_MAX),
  phone: optionalText(CHECKOUT_PHONE_MAX),
});

export type Address = z.infer<typeof AddressSchema>;

/** The one way the shop ships today. */
export const ShippingMethodSchema = z.enum(["standard"]);
export type ShippingMethod = z.infer<typeof ShippingMethodSchema>;

/**
 * The one way the shop is paid today. Cash on delivery is what the design
 * offers; a card provider (plan.md's Stripe) adds a value here.
 */
export const PaymentMethodSchema = z.enum(["cod"]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const CheckoutSchema = z
  .object({
    /** Minted with the form: a second submission of it finds the first order. */
    idempotencyKey: z.uuid(),
    email: z.string().trim().toLowerCase().max(CHECKOUT_EMAIL_MAX).pipe(z.email()),
    shipping: AddressSchema,
    billingSameAsShipping: z.boolean(),
    /** Required unless billing is the shipping address. */
    billing: AddressSchema.optional(),
    shippingMethod: ShippingMethodSchema,
    paymentMethod: PaymentMethodSchema,
    note: optionalText(CHECKOUT_NOTE_MAX),
    /**
     * The coupon the shopper applied, by code — never its discount, which the
     * server works out from the coupon and the cart (`couponDiscount`).
     */
    couponCode: CouponCodeSchema.optional(),
  })
  .refine((input) => input.billingSameAsShipping || input.billing !== undefined, {
    path: ["billing"],
    message: "a billing address is required unless it is the shipping address",
  });

export type Checkout = z.infer<typeof CheckoutSchema>;

/**
 * The product as it was when it was bought — what an order line's
 * `product_snapshot` column holds (plan.md's decision 4). Everything a line
 * needs to render with the catalogue gone.
 *
 * Here rather than beside the web app's order mapper because it is the shape
 * of stored data, read back by anything that ever shows an order — the admin's
 * order screens (Phase 4) included.
 */
export const ProductSnapshotSchema = z.object({
  productId: z.string(),
  name: z.string(),
  sku: z.string(),
  options: z.array(z.object({ option: z.string(), value: z.string() })),
  imageId: z.string().nullable(),
});

export type ProductSnapshot = z.infer<typeof ProductSnapshotSchema>;
