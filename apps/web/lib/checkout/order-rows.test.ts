import { describe, expect, it, vi } from "vitest";
import type { CartItem } from "@my-ecommerce/shared";
import { snapshotOf, toOrderView, type OrderRow } from "./order-rows";

// The media module imports the client; nothing here queries.
vi.mock("@my-ecommerce/db", () => ({ prisma: {} }));

const decimal = (value: string) => ({ toString: () => value });

const address = (kind: "shipping" | "billing", city: string) => ({
  kind,
  firstName: "Ada",
  lastName: "Lovelace",
  line1: "1 Century Avenue",
  line2: null,
  city,
  region: "Shanghai",
  postalCode: "200120",
  countryCode: "CN",
  phone: null,
});

function row(over: Partial<OrderRow> = {}): OrderRow {
  return {
    orderNumber: 1001,
    email: "ada@example.com",
    paymentMethod: "cod",
    shippingMethod: "standard",
    currency: "USD",
    displayCurrency: "USD",
    exchangeRate: decimal("1.0000000000"),
    subtotal: decimal("21.23"),
    discountTotal: decimal("0.00"),
    couponCode: null,
    shippingTotal: decimal("5.00"),
    grandTotal: decimal("26.23"),
    note: null,
    createdAt: new Date("2026-10-21T12:00:00.000Z"),
    items: [
      {
        id: "oi_1",
        productSnapshot: {
          productId: "prod_1",
          name: "xihsudhudf",
          sku: "2442-23",
          options: [{ option: "Color", value: "red" }],
          imageId: "media_1",
        },
        quantity: 1,
        unitPrice: decimal("21.23"),
        lineTotal: decimal("21.23"),
      },
    ],
    addresses: [address("shipping", "Shanghai"), address("billing", "Beijing")],
    ...over,
  } as unknown as OrderRow;
}

describe("toOrderView", () => {
  it("reads the stored money back as decimal strings in the order's currency", () => {
    const view = toOrderView(row());

    expect(view.subtotal).toEqual({ amount: "21.23", currency: "USD" });
    expect(view.discountTotal).toEqual({ amount: "0.00", currency: "USD" });
    expect(view.couponCode).toBeNull();
    expect(view.shippingTotal).toEqual({ amount: "5.00", currency: "USD" });
    expect(view.grandTotal).toEqual({ amount: "26.23", currency: "USD" });
    expect(view.createdAt).toBe("2026-10-21T12:00:00.000Z");
  });

  it("draws a line from its snapshot, not the live catalogue", () => {
    const [line] = toOrderView(row()).items;

    expect(line).toMatchObject({
      name: "xihsudhudf",
      sku: "2442-23",
      options: [{ option: "Color", value: "red" }],
      quantity: 1,
      unitPrice: { amount: "21.23", currency: "USD" },
    });
    expect(line?.image?.url).toContain("media_1");
  });

  it("still draws a line whose snapshot it cannot read", () => {
    const view = toOrderView(
      row({
        items: [
          {
            id: "oi_1",
            productSnapshot: { unexpected: true },
            quantity: 2,
            unitPrice: decimal("1.00"),
            lineTotal: decimal("2.00"),
          },
        ] as unknown as OrderRow["items"],
      }),
    );

    expect(view.items[0]).toMatchObject({ name: "Item", image: null, quantity: 2 });
  });

  it("keeps the shipping and billing addresses apart, and copes with one missing", () => {
    const view = toOrderView(row());
    expect(view.shipping?.city).toBe("Shanghai");
    expect(view.billing?.city).toBe("Beijing");
    expect(view.shipping).not.toHaveProperty("kind");

    expect(toOrderView(row({ addresses: [] })).billing).toBeNull();
  });

  it("writes the order in the currency, and at the rate, it was placed in", () => {
    expect(toOrderView(row()).display).toEqual({
      code: "USD",
      options: [{ code: "USD", rate: "1" }],
    });
    expect(
      toOrderView(row({ displayCurrency: "EUR", exchangeRate: decimal("0.9200000000") } as Partial<OrderRow>))
        .display,
    ).toEqual({
      code: "EUR",
      options: [
        { code: "USD", rate: "1" },
        { code: "EUR", rate: "0.9200000000" },
      ],
    });
  });
});

describe("snapshotOf", () => {
  it("freezes what a line needs to render with the catalogue gone", () => {
    const item = {
      id: "item_1",
      quantity: 1,
      variant: { id: "var_1", sku: "SKU-1", price: { amount: "1", currency: "USD" } },
      optionValues: [
        { id: "v1", name: "red", option: "Color" },
        { id: "v2", name: "", option: "Size" },
      ],
      product: { id: "prod_1", slug: "s", name: "Earbuds", image: null, categories: [] },
    } as unknown as CartItem;

    expect(snapshotOf(item)).toEqual({
      productId: "prod_1",
      name: "Earbuds",
      sku: "SKU-1",
      // A value with no name in any language says nothing; it is left out.
      options: [{ option: "Color", value: "red" }],
      imageId: null,
    });
  });
});

describe("toOrderView's coupon", () => {
  it("carries the code and what it took off", () => {
    const view = toOrderView(row({ discountTotal: decimal("2.12") as never, couponCode: "SAVE10" }));

    expect(view.couponCode).toBe("SAVE10");
    expect(view.discountTotal).toEqual({ amount: "2.12", currency: "USD" });
  });
});
