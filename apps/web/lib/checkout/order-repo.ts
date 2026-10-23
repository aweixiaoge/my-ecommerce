import { randomBytes } from "node:crypto";
import { prisma, type Prisma } from "@my-ecommerce/db";
import {
  addMoney,
  multiplyMoney,
  subtractMoney,
  type Address,
  type Checkout,
  type CouponRefusal,
  type Money,
} from "@my-ecommerce/shared";
import { cartSelect, toCart } from "@/lib/cart/cart-rows";
import { hashCartToken } from "@/lib/cart/cart-token";
import { shippingCost } from "@/lib/cart/shipping";
import { SHOP_CURRENCY, type DisplayCurrency } from "@/lib/currency/display";
import type { Locale } from "@/lib/languages";
import { redeemCoupon } from "./coupon-repo";
import { ORDER_SELECT, snapshotOf, toOrderView, type OrderView } from "./order-rows";

/**
 * Placing orders, and reading one back for its confirmation page.
 *
 * An order is made from the cart the cookie opens, read again inside the same
 * transaction that writes the order — never from figures the form sent. The
 * form is intent (`CheckoutSchema`); the prices, the stock and the totals are
 * whatever the database says at the moment of placing.
 */

/**
 * What placing did.
 *
 * - `placed`: the order exists — this call made it, or an earlier submission
 *   of the same form did (the idempotency key). Either way, this is its link.
 * - `empty`: nothing in the cart can be bought, so there is nothing to order.
 * - `stockChanged`: a line asked for more than is left. Nothing was written —
 *   the shopper goes back to a cart that now says which line and why.
 * - `couponRefused`: the coupon sent with the form no longer takes anything
 *   off — it expired, or was deleted, since it was applied. Nothing was
 *   written: placing the order without it would charge more than the total
 *   the shopper agreed to, so they are asked again instead.
 */
export type PlaceOrderResult =
  | { status: "placed"; orderNumber: number; accessKey: string }
  | { status: "empty" }
  | { status: "stockChanged" }
  | { status: "couponRefused"; reason: CouponRefusal };

/** Thrown inside the transaction to roll it back; never escapes `placeOrder`. */
class StockChanged extends Error {}

export async function placeOrder(
  token: string | undefined,
  input: Checkout,
  context: {
    locale: Locale;
    display: DisplayCurrency;
    /** The account signed in at checkout, which puts the order in its history; null for a guest. */
    customerId?: string | null;
  },
  now?: Date,
): Promise<PlaceOrderResult> {
  const earlier = await findByIdempotencyKey(input.idempotencyKey);
  if (earlier) return earlier;

  if (!token) return { status: "empty" };

  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.cart.findFirst({
        where: { tokenHash: hashCartToken(token), expiresAt: { gt: now ?? new Date() } },
        select: cartSelect(context.locale),
      });
      if (!row) return { status: "empty" } as const;

      // Only the lines that can be bought as they stand. A line with an issue
      // stays in the cart for the shopper to deal with; it is not ordered.
      const cart = toCart(row, context.locale);
      const lines = cart.items.filter((item) => item.unavailableReason === null);
      if (lines.length === 0) return { status: "empty" } as const;

      // Judged before any stock is taken, so a refusal has nothing to undo.
      let discount: Money = { amount: "0.00", currency: cart.subtotal.currency };
      if (input.couponCode) {
        const coupon = await redeemCoupon(input.couponCode, lines, now ?? new Date(), tx);
        if (coupon.status !== "applied") {
          return { status: "couponRefused", reason: coupon.status } as const;
        }
        discount = coupon.discount;
      }

      // Take the stock, line by line, only where enough is left. Two lines can
      // be one variant in two sizes, which is why this is per line and in
      // order rather than one statement: each sees the last one's decrement.
      for (const line of lines) {
        const taken = await tx.productVariant.updateMany({
          where: { id: line.variant.id, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (taken.count === 0) throw new StockChanged();
      }

      // The free-shipping threshold is read on the subtotal before the
      // discount, so a coupon is never worth less than it says by tipping the
      // order back under it.
      const shipping = shippingCost(cart.subtotal);
      const accessKey = randomBytes(24).toString("base64url");

      const order = await tx.order.create({
        data: {
          accessKey,
          idempotencyKey: input.idempotencyKey,
          customerId: context.customerId ?? null,
          email: input.email,
          paymentMethod: input.paymentMethod,
          shippingMethod: input.shippingMethod,
          locale: context.locale,
          currency: SHOP_CURRENCY,
          displayCurrency: context.display.code,
          exchangeRate: rateOf(context.display),
          subtotal: cart.subtotal.amount,
          discountTotal: discount.amount,
          couponCode: input.couponCode ?? null,
          shippingTotal: shipping.amount,
          taxTotal: "0.00",
          grandTotal: addMoney(subtractMoney(cart.subtotal, discount), shipping).amount,
          note: input.note ?? null,
          items: {
            create: lines.map((line) => ({
              variantId: line.variant.id,
              productSnapshot: snapshotOf(line),
              quantity: line.quantity,
              unitPrice: line.variant.price.amount,
              lineTotal: multiplyMoney(line.variant.price, line.quantity).amount,
            })),
          },
          addresses: {
            create: [
              addressRow("shipping", input.shipping),
              addressRow(
                "billing",
                input.billingSameAsShipping || !input.billing ? input.shipping : input.billing,
              ),
            ],
          },
          statusHistory: {
            create: { fromStatus: null, toStatus: "pending", actor: "customer" },
          },
        },
        select: { orderNumber: true },
      });

      await tx.cartItem.deleteMany({ where: { id: { in: lines.map((line) => line.id) } } });

      return { status: "placed", orderNumber: order.orderNumber, accessKey } as const;
    });
  } catch (error) {
    if (error instanceof StockChanged) return { status: "stockChanged" };

    // Two submissions of one form raced, and the other won the unique key:
    // its order is this one's answer.
    if ((error as { code?: unknown }).code === "P2002") {
      const winner = await findByIdempotencyKey(input.idempotencyKey);
      if (winner) return winner;
    }

    throw error;
  }
}

/** An order for its confirmation page, when the key in the link is its key. */
export async function getOrder(orderNumber: number, accessKey: string): Promise<OrderView | null> {
  if (!Number.isSafeInteger(orderNumber) || accessKey === "") return null;

  const row = await prisma.order.findFirst({
    where: { orderNumber, accessKey },
    select: ORDER_SELECT,
  });

  return row ? toOrderView(row) : null;
}

async function findByIdempotencyKey(key: string): Promise<PlaceOrderResult | null> {
  const order = await prisma.order.findUnique({
    where: { idempotencyKey: key },
    select: { orderNumber: true, accessKey: true },
  });

  return order ? { status: "placed", ...order } : null;
}

/** Units of the display currency per one of the shop's — decision 5's rate. */
function rateOf(display: DisplayCurrency): string {
  return display.options.find((option) => option.code === display.code)?.rate ?? "1";
}

function addressRow(
  kind: "shipping" | "billing",
  address: Address,
): Prisma.OrderAddressCreateWithoutOrderInput {
  return {
    kind,
    firstName: address.firstName,
    lastName: address.lastName,
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city,
    region: address.region ?? null,
    postalCode: address.postalCode,
    countryCode: address.countryCode,
    phone: address.phone ?? null,
  };
}
