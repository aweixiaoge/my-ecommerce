import { prisma, type Prisma } from "@my-ecommerce/db";
import {
  couponDiscount,
  type CartItem,
  type CouponRefusal,
  type Money,
} from "@my-ecommerce/shared";

/**
 * Redeeming a coupon against the lines being ordered.
 *
 * The rule is the shared `couponDiscount`; what this adds is the one thing
 * only the database knows — whether a coupon has the code at all — and the
 * lines as the cart reads them. Both the checkout's "Apply" preview and
 * `placeOrder` come through here, the second inside its transaction, so a
 * coupon is judged against the same cart the order is made from.
 */

export type CouponRedemption =
  | { status: "applied"; code: string; discount: Money }
  | { status: CouponRefusal };

/** The client to read with: the shared one, or a transaction's. */
type CouponReader = Pick<Prisma.TransactionClient, "coupon">;

export async function redeemCoupon(
  code: string,
  lines: readonly CartItem[],
  now: Date = new Date(),
  client: CouponReader = prisma,
): Promise<CouponRedemption> {
  const row = await client.coupon.findUnique({
    where: { code },
    select: {
      code: true,
      type: true,
      amount: true,
      currency: true,
      appliesToAllProducts: true,
      expiresAt: true,
      products: { select: { productId: true } },
    },
  });
  if (!row) return { status: "unknown" };

  return couponDiscount(
    {
      code: row.code,
      type: row.type,
      amount: row.amount.toString(),
      currency: row.currency,
      appliesToAllProducts: row.appliesToAllProducts,
      productIds: row.products.map((product) => product.productId),
      expiresAt: row.expiresAt,
    },
    lines.map((line) => ({ productId: line.product.id, lineTotal: line.lineTotal })),
    now,
  );
}
