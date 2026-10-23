import type { Prisma } from "@my-ecommerce/db";
import {
  ProductSnapshotSchema,
  type CartItem,
  type Media,
  type Money,
  type ProductSnapshot,
} from "@my-ecommerce/shared";
import { mediaRef } from "@/lib/catalog/product-summary";
import type { DisplayCurrency } from "@/lib/currency/display";

/**
 * What an order row is, and how it becomes something a page can draw.
 *
 * The split the catalogue's mappers use: no database in here, so the unit lane
 * can reach every branch. The order a page shows is a local type rather than a
 * shared contract for the reason `lib/blog/blog-repo.ts` gives — one reader so
 * far, and the contract is the API's to settle when there is one.
 */

/** A cart line, frozen into a snapshot (`ProductSnapshotSchema`). */
export function snapshotOf(item: CartItem): ProductSnapshot {
  return {
    productId: item.product.id,
    name: item.product.name,
    sku: item.variant.sku,
    options: item.optionValues
      .filter((value) => value.name !== "")
      .map((value) => ({ option: value.option, value: value.name })),
    imageId: item.product.image?.id ?? null,
  };
}

export const ORDER_SELECT = {
  orderNumber: true,
  email: true,
  paymentMethod: true,
  shippingMethod: true,
  currency: true,
  displayCurrency: true,
  exchangeRate: true,
  subtotal: true,
  discountTotal: true,
  couponCode: true,
  shippingTotal: true,
  grandTotal: true,
  note: true,
  createdAt: true,
  items: {
    orderBy: { id: "asc" },
    select: {
      id: true,
      productSnapshot: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true,
    },
  },
  addresses: {
    select: {
      kind: true,
      firstName: true,
      lastName: true,
      line1: true,
      line2: true,
      city: true,
      region: true,
      postalCode: true,
      countryCode: true,
      phone: true,
    },
  },
} as const satisfies Prisma.OrderSelect;

export type OrderRow = Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>;

export interface OrderAddressView {
  firstName: string;
  lastName: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string;
  countryCode: string;
  phone: string | null;
}

export interface OrderView {
  orderNumber: number;
  /** ISO 8601, so it crosses to the page as a string. */
  createdAt: string;
  email: string;
  paymentMethod: string;
  shippingMethod: string;
  /**
   * The currency the order was read in, at the rate it was placed at
   * (plan.md's decision 5) — so its confirmation shows the figures the
   * shopper agreed to, whatever the rates or their currency menu say later.
   */
  display: DisplayCurrency;
  subtotal: Money;
  /** What the coupon took off; zero for an order placed without one. */
  discountTotal: Money;
  /** The coupon's code, as it was redeemed; null without one. */
  couponCode: string | null;
  shippingTotal: Money;
  grandTotal: Money;
  note: string | null;
  items: {
    id: string;
    name: string;
    sku: string;
    options: { option: string; value: string }[];
    image: Media | null;
    quantity: number;
    unitPrice: Money;
    lineTotal: Money;
  }[];
  shipping: OrderAddressView | null;
  billing: OrderAddressView | null;
}

/**
 * The row as the confirmation page reads it.
 *
 * A line whose snapshot does not parse — a row written by hand, or by a future
 * shape of the snapshot this code predates — still renders, as its SKU-less
 * "Item", rather than taking the order's page down: the money on it is the
 * record, and the money is in columns, not the JSON.
 */
export function toOrderView(row: OrderRow): OrderView {
  const money = (amount: { toString(): string }): Money => ({
    amount: amount.toString(),
    currency: row.currency,
  });
  const address = (kind: "shipping" | "billing"): OrderAddressView | null => {
    const found = row.addresses.find((candidate) => candidate.kind === kind);
    if (!found) return null;

    return {
      firstName: found.firstName,
      lastName: found.lastName,
      line1: found.line1,
      line2: found.line2,
      city: found.city,
      region: found.region,
      postalCode: found.postalCode,
      countryCode: found.countryCode,
      phone: found.phone,
    };
  };

  return {
    orderNumber: row.orderNumber,
    createdAt: row.createdAt.toISOString(),
    email: row.email,
    paymentMethod: row.paymentMethod,
    shippingMethod: row.shippingMethod,
    display: {
      code: row.displayCurrency,
      options: [
        { code: row.currency, rate: "1" },
        ...(row.displayCurrency === row.currency
          ? []
          : [{ code: row.displayCurrency, rate: row.exchangeRate.toString() }]),
      ],
    },
    subtotal: money(row.subtotal),
    discountTotal: money(row.discountTotal),
    couponCode: row.couponCode,
    shippingTotal: money(row.shippingTotal),
    grandTotal: money(row.grandTotal),
    note: row.note,
    items: row.items.map((item) => {
      const parsed = ProductSnapshotSchema.safeParse(item.productSnapshot);
      const snapshot = parsed.success
        ? parsed.data
        : { productId: "", name: "Item", sku: "", options: [], imageId: null };

      return {
        id: item.id,
        name: snapshot.name,
        sku: snapshot.sku,
        options: snapshot.options,
        image: snapshot.imageId ? mediaRef({ id: snapshot.imageId, position: 0 }) : null,
        quantity: item.quantity,
        unitPrice: money(item.unitPrice),
        lineTotal: money(item.lineTotal),
      };
    }),
    shipping: address("shipping"),
    billing: address("billing"),
  };
}
