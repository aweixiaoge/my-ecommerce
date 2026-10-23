import { prisma, type CouponType } from "@my-ecommerce/db";
import type { AdminCouponCreate, Money } from "@my-ecommerce/shared";
import { SHOP_CURRENCY } from "@/lib/currency/display";
import { DEFAULT_LOCALE } from "../locale";

/**
 * Coupons, as the admin's coupon screens read and write them.
 *
 * Creating, listing and editing them. Redeeming one is the checkout's
 * (`lib/checkout/coupon-repo.ts`).
 */

/**
 * The code is already taken.
 *
 * Its own type for the reason `DuplicateSkuError` is one: the schema can check
 * a code's shape, but only the database knows whether another coupon has it,
 * and this is the one failure the person can fix — by generating another.
 */
export class DuplicateCouponCodeError extends Error {
  constructor() {
    super("Another coupon already uses this code.");
    this.name = "DuplicateCouponCodeError";
  }
}

/**
 * A product named in the selection no longer exists — deleted in another tab
 * between the form loading and the save, or a crafted POST.
 */
export class UnknownCouponProductError extends Error {
  constructor() {
    super("One of the selected products no longer exists. Select them again.");
    this.name = "UnknownCouponProductError";
  }
}

/** The coupon being saved is gone — deleted in another tab, or a crafted id. */
export class CouponNotFoundError extends Error {
  constructor() {
    super("This coupon no longer exists.");
    this.name = "CouponNotFoundError";
  }
}

/**
 * Writes a coupon and its product links in one statement.
 *
 * A fixed amount is in the shop's currency — the one every price is stored in
 * — and a percentage has none.
 */
export async function createCoupon(input: AdminCouponCreate): Promise<string> {
  try {
    const coupon = await prisma.coupon.create({
      data: {
        code: input.code,
        type: input.type,
        amount: input.amount,
        currency: input.type === "fixed_amount" ? SHOP_CURRENCY : null,
        appliesToAllProducts: input.appliesToAllProducts,
        expiresAt: new Date(input.expiresAt),
        products: {
          create: input.productIds.map((productId) => ({ productId })),
        },
      },
      select: { id: true },
    });

    return coupon.id;
  } catch (error) {
    throw saveError(error);
  }
}

/** A coupon as the edit form starts from it. */
export interface CouponForEdit {
  id: string;
  code: string;
  type: CouponType;
  /** The decimal string the form's box holds: "10" for a percent, "5.50" for money. */
  amount: string;
  appliesToAllProducts: boolean;
  productIds: string[];
  /** ISO 8601 — the form shows it in the browser's own time. */
  expiresAt: string;
  /** ISO 8601; the edit screen keys the form on it. */
  updatedAt: string;
}

export async function getCouponForEdit(id: string): Promise<CouponForEdit | null> {
  const row = await prisma.coupon.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      type: true,
      amount: true,
      appliesToAllProducts: true,
      expiresAt: true,
      updatedAt: true,
      products: { select: { productId: true } },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    code: row.code,
    type: row.type,
    // Money with its cents ("5.50", not Decimal's "5.5"); a percent as written.
    amount: row.type === "fixed_amount" ? row.amount.toFixed(2) : row.amount.toString(),
    appliesToAllProducts: row.appliesToAllProducts,
    productIds: row.products.map((product) => product.productId),
    expiresAt: row.expiresAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Rewrites a coupon and replaces its product links, in one transaction — a
 * coupon whose amount changed but whose products did not would be a coupon
 * nobody configured.
 *
 * Orders placed with it keep the code and discount they were placed with
 * (`orders.coupon_code`), so editing changes only what is redeemed from now on.
 */
export async function updateCoupon(id: string, input: AdminCouponCreate): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.coupon.update({
        where: { id },
        data: {
          code: input.code,
          type: input.type,
          amount: input.amount,
          currency: input.type === "fixed_amount" ? SHOP_CURRENCY : null,
          appliesToAllProducts: input.appliesToAllProducts,
          expiresAt: new Date(input.expiresAt),
        },
      });
      await tx.couponProduct.deleteMany({ where: { couponId: id } });
      if (input.productIds.length > 0) {
        await tx.couponProduct.createMany({
          data: input.productIds.map((productId) => ({ couponId: id, productId })),
        });
      }
    });
  } catch (error) {
    // On update, P2025 is the coupon itself: the row to update is not there.
    if ((error as { code?: unknown } | null)?.code === "P2025") throw new CouponNotFoundError();
    throw saveError(error);
  }
}

/** A failed write as the error the form can name, or the error itself. */
function saveError(error: unknown): unknown {
  const code = (error as { code?: unknown } | null)?.code;
  // The only unique index on `coupons` is the code; `coupon_products`' key
  // cannot collide because the schema de-duplicates the ids.
  if (code === "P2002") return new DuplicateCouponCodeError();
  // A foreign key: a product id that is not a row.
  if (code === "P2003" || code === "P2025") return new UnknownCouponProductError();
  return error;
}

/** One coupon, as the list draws it. */
export interface AdminCouponSummary {
  id: string;
  code: string;
  type: CouponType;
  /** A fixed discount as money; a percentage as its decimal string, e.g. "10". */
  value: { kind: "fixed"; money: Money } | { kind: "percentage"; percent: string };
  appliesToAllProducts: boolean;
  productCount: number;
  /** ISO 8601. */
  expiresAt: string;
  /** Whether it had stopped working when the list was read. */
  expired: boolean;
  /** ISO 8601. */
  createdAt: string;
}

/** Every coupon, newest first. */
export async function listCoupons(now: Date = new Date()): Promise<AdminCouponSummary[]> {
  const rows = await prisma.coupon.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      code: true,
      type: true,
      amount: true,
      currency: true,
      appliesToAllProducts: true,
      expiresAt: true,
      createdAt: true,
      _count: { select: { products: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    type: row.type,
    value:
      row.type === "fixed_amount"
        ? {
            kind: "fixed",
            money: { amount: row.amount.toString(), currency: row.currency ?? SHOP_CURRENCY },
          }
        : { kind: "percentage", percent: row.amount.toString() },
    appliesToAllProducts: row.appliesToAllProducts,
    productCount: row._count.products,
    expiresAt: row.expiresAt.toISOString(),
    // The checkout's rule (`couponDiscount`): good until the instant, exclusive.
    expired: row.expiresAt.getTime() <= now.getTime(),
    createdAt: row.createdAt.toISOString(),
  }));
}

/** A product the coupon form can offer as a checkbox. */
export interface CouponProductChoice {
  id: string;
  name: string;
  status: string;
}

/**
 * Every product, by name, for the selection — drafts included, so a coupon
 * can be prepared before the product it is for goes live.
 */
export async function listCouponProductChoices(): Promise<CouponProductChoice[]> {
  const rows = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      translations: { where: { locale: DEFAULT_LOCALE }, select: { name: true } },
    },
  });

  return rows
    .map((row) => ({
      id: row.id,
      name: row.translations.at(0)?.name ?? "",
      status: row.status,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
