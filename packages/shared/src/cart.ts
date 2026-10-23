import { z } from "zod";
import { MoneySchema } from "./money";
import { CurrencyCodeSchema } from "./common";
import {
  CategoryRefSchema,
  MediaSchema,
  OptionValueSchema,
  VariantSchema,
} from "./catalog";

/**
 * The cart is a list of INTENT, not a list of prices.
 *
 * The client sends variant ids and quantities. Every monetary field below is
 * computed by the server on read — the browser never supplies a price, a
 * discount, or a total. Anything the client could set is something a user
 * could tamper with.
 */

/**
 * The most of one variant a single line holds.
 *
 * A bound rather than a policy, the way `review.ts` sizes its fields: far above
 * what a shopper buys at once, and low enough that a hand-written POST cannot
 * park a warehouse in one cart. Stock caps a line further — see
 * `apps/web/lib/cart/cart-repo.ts`.
 */
export const CART_LINE_QUANTITY_MAX = 99;

/**
 * Why a line cannot be bought as it stands — a code, not a sentence.
 *
 * The copy is the storefront's catalog, in the reader's language; the contract
 * says only which state the line is in.
 *
 * - `withdrawn`: the product is no longer on sale, or its variant lost the
 *   price it was added at.
 * - `outOfStock`: none left.
 * - `limitedStock`: fewer left than the line asks for. The line stays as the
 *   shopper left it, rather than being cut down behind their back on a read.
 */
export const CartLineIssueSchema = z.enum(["withdrawn", "outOfStock", "limitedStock"]);

export type CartLineIssue = z.infer<typeof CartLineIssueSchema>;

export const CartItemSchema = z.object({
  id: z.string(),
  quantity: z.number().int().positive(),
  variant: VariantSchema,
  /**
   * Everything the shopper chose, in the product page's option order: the
   * values that select the variant — Colour — and the pick from an option no
   * variant stands behind — Size. `variant.optionValues` is only the first
   * half, which is why a line is named from this.
   *
   * Each carries its option's name too, translated, because the cart page
   * writes a line as "Color: Blue" rather than a bare "Blue".
   */
  optionValues: z.array(OptionValueSchema.extend({ option: z.string() })),
  product: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    image: MediaSchema.nullable(),
    /** Where the line links to: a product lives under its first category. */
    categories: z.array(CategoryRefSchema),
  }),
  /** Server-computed: variant price × quantity. */
  lineTotal: MoneySchema,
  /** Set when the line is no longer purchasable as it stands. */
  unavailableReason: CartLineIssueSchema.nullable(),
});

export type CartItem = z.infer<typeof CartItemSchema>;

export const CartSchema = z.object({
  id: z.string(),
  currency: CurrencyCodeSchema,
  items: z.array(CartItemSchema),
  /** Units across the lines that can be bought — what the header's badge shows. */
  itemCount: z.number().int().nonnegative(),
  /** The lines that can be bought, summed. A line with an issue is not in it. */
  subtotal: MoneySchema,
  discountTotal: MoneySchema,
  /** Null until a shipping address is known. */
  shippingTotal: MoneySchema.nullable(),
  /** Null until a tax jurisdiction is known. */
  taxTotal: MoneySchema.nullable(),
  grandTotal: MoneySchema,
});

export type Cart = z.infer<typeof CartSchema>;

/**
 * What an "Add to cart" button sends.
 *
 * Exactly one of the two ids. A product page knows which variant the shopper
 * picked and sends it; a shop card has no picker, so it sends the product and
 * the server chooses the variant the card's price advertises. The choice is
 * the server's for the reason at the top of this file — and because the card
 * would otherwise have to be handed a variant id the listing does not carry.
 *
 * `optionValueId` is the size, when the product offers one: a value of an
 * option no variant stands behind. Optional, because the server falls back to
 * the first size — the one the product page opens on — exactly as it falls
 * back to the default variant for a card.
 *
 * The quantity arrives as a form field, so it is coerced; a missing one means
 * one.
 */
export const CartAddSchema = z
  .object({
    variantId: z.string().min(1).max(64).optional(),
    productId: z.string().min(1).max(64).optional(),
    optionValueId: z.string().min(1).max(64).optional(),
    quantity: z.coerce.number().int().min(1).max(CART_LINE_QUANTITY_MAX).default(1),
  })
  .refine((input) => (input.variantId === undefined) !== (input.productId === undefined), {
    message: "send a variantId or a productId, not both",
  });

export type CartAdd = z.infer<typeof CartAddSchema>;

/**
 * What the cart page's quantity buttons send. Zero removes the line, which is
 * what "−" on a quantity of one means.
 */
export const CartLineUpdateSchema = z.object({
  itemId: z.string().min(1).max(64),
  quantity: z.coerce.number().int().min(0).max(CART_LINE_QUANTITY_MAX),
});

export type CartLineUpdate = z.infer<typeof CartLineUpdateSchema>;
