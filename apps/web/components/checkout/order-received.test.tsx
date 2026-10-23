import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { OrderView } from "@/lib/checkout/order-rows";
import { en } from "@/lib/i18n/messages/en";
import { OrderReceived } from "./order-received";

const usd = (amount: string) => ({ amount, currency: "USD" });

const address = {
  firstName: "Ada",
  lastName: "Lovelace",
  line1: "1 Century Avenue",
  line2: "Floor 9",
  city: "Shanghai",
  region: "Shanghai",
  postalCode: "200120",
  countryCode: "CN",
  phone: "+86 21 0000 0000",
};

const order: OrderView = {
  orderNumber: 1001,
  createdAt: "2026-10-21T12:00:00.000Z",
  email: "ada@example.com",
  paymentMethod: "cod",
  shippingMethod: "standard",
  display: { code: "USD", options: [{ code: "USD", rate: "1" }] },
  subtotal: usd("21.23"),
  discountTotal: usd("0.00"),
  couponCode: null,
  shippingTotal: usd("5.00"),
  grandTotal: usd("26.23"),
  note: "Leave at the door",
  items: [
    {
      id: "oi_1",
      name: "xihsudhudf",
      sku: "2442-23",
      options: [
        { option: "Color", value: "red" },
        { option: "", value: "L" },
      ],
      image: null,
      quantity: 1,
      unitPrice: usd("21.23"),
      lineTotal: usd("21.23"),
    },
  ],
  shipping: address,
  billing: { ...address, line2: null, phone: null, city: "Beijing" },
};

const render = (view: OrderView = order) =>
  renderToStaticMarkup(<OrderReceived order={view} messages={en.checkout} locale="en" />);

describe("OrderReceived", () => {
  it("thanks the shopper and gives the facts they write down", () => {
    const markup = render();

    expect(markup).toContain("Thank you. Your order has been received.");
    expect(markup).toContain("#1001");
    expect(markup).toContain("October 21, 2026");
    expect(markup).toContain("ada@example.com");
    expect(markup).toContain("Cash on delivery");
  });

  it("lists what was bought from the order's own record", () => {
    const markup = render();

    expect(markup).toContain("xihsudhudf");
    expect(markup).toContain("Color: red");
    expect(markup).toContain("<p>L</p>");
    expect(markup).toContain("Standard delivery — $5.00");
    expect(markup).toContain("$26.23");
    expect(markup).toContain("Leave at the door");
  });

  it("shows the coupon's discount when one was redeemed, and no row without", () => {
    const markup = render({
      ...order,
      discountTotal: usd("2.12"),
      couponCode: "SAVE10",
      grandTotal: usd("24.11"),
    });

    expect(markup).toContain("Discount (SAVE10)");
    expect(markup).toContain("−$2.12");
    expect(render()).not.toContain("Discount");
  });

  it("says free shipping was free", () => {
    expect(render({ ...order, shippingTotal: usd("0.00") })).toContain("Standard delivery — Free");
  });

  it("writes the figures in the currency and at the rate the order was placed at", () => {
    const markup = render({
      ...order,
      display: {
        code: "EUR",
        options: [
          { code: "USD", rate: "1" },
          { code: "EUR", rate: "0.92" },
        ],
      },
    });

    // 26.23 × 0.92 = 24.1316 → €24.13.
    expect(markup).toContain("€24.13");
  });

  it("writes both addresses as a label would, with the country by name", () => {
    const markup = render();

    expect(markup).toContain("Shipping address");
    expect(markup).toContain("Floor 9");
    expect(markup).toContain("Shanghai, Shanghai, 200120");
    expect(markup).toContain("China");
    expect(markup).toContain("Beijing, Shanghai, 200120");
  });

  it("leaves out what the order does not have", () => {
    const markup = render({ ...order, note: null, shipping: null, billing: null, paymentMethod: "card" });

    expect(markup).not.toContain("Leave at the door");
    expect(markup).not.toContain("Shipping address");
    expect(markup).toContain("card");
  });
});
