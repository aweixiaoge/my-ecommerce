import { z } from "zod";
import { MoneySchema } from "./money";
import { CurrencyCodeSchema } from "./common";
import { MediaSchema, VariantSchema } from "./catalog";

/**
 * The cart is a list of INTENT, not a list of prices.
 *
 * The client sends variant ids and quantities. Every monetary field below is
 * computed by the server on read — the browser never supplies a price, a
 * discount, or a total. Anything the client could set is something a user
 * could tamper with.
 */

export const CartItemSchema = z.object({
  id: z.string(),
  quantity: z.number().int().positive(),
  variant: VariantSchema,
  product: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    image: MediaSchema.nullable(),
  }),
  /** Server-computed: variant price × quantity. */
  lineTotal: MoneySchema,
  /** Set when the line is no longer purchasable — out of stock, withdrawn. */
  unavailableReason: z.string().nullable(),
});

export type CartItem = z.infer<typeof CartItemSchema>;

export const CartSchema = z.object({
  id: z.string(),
  currency: CurrencyCodeSchema,
  items: z.array(CartItemSchema),
  itemCount: z.number().int().nonnegative(),
  subtotal: MoneySchema,
  discountTotal: MoneySchema,
  /** Null until a shipping address is known. */
  shippingTotal: MoneySchema.nullable(),
  /** Null until a tax jurisdiction is known. */
  taxTotal: MoneySchema.nullable(),
  grandTotal: MoneySchema,
});

export type Cart = z.infer<typeof CartSchema>;
