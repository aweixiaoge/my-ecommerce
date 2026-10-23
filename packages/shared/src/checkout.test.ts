import { describe, expect, it } from "vitest";
import { CHECKOUT_NAME_MAX, CheckoutSchema, ProductSnapshotSchema } from "./checkout";

const address = {
  countryCode: "CN",
  firstName: "Ada",
  lastName: "Lovelace",
  line1: "1 Century Avenue",
  line2: "",
  city: "Shanghai",
  region: "Shanghai",
  postalCode: "200120",
  phone: "",
};

/** A submission the checkout form can actually produce. */
const submission = {
  idempotencyKey: "4b0c5c3e-6a8f-4f45-9d6e-1f2a3b4c5d6e",
  email: "  Ada@Example.com ",
  shipping: address,
  billingSameAsShipping: true,
  shippingMethod: "standard",
  paymentMethod: "cod",
  note: "",
};

describe("CheckoutSchema", () => {
  it("accepts a checkout, tidying the email and dropping blank optional boxes", () => {
    const result = CheckoutSchema.safeParse(submission);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.email).toBe("ada@example.com");
    // A box left empty is absent, not an empty string stored on the order.
    expect(result.data.shipping.line2).toBeUndefined();
    expect(result.data.shipping.phone).toBeUndefined();
    expect(result.data.note).toBeUndefined();
  });

  it("requires a billing address unless it is the shipping one", () => {
    const without = CheckoutSchema.safeParse({ ...submission, billingSameAsShipping: false });

    expect(without.success).toBe(false);
    expect(!without.success && without.error.issues[0]?.path).toEqual(["billing"]);
    expect(
      CheckoutSchema.safeParse({ ...submission, billingSameAsShipping: false, billing: address })
        .success,
    ).toBe(true);
  });

  it.each([
    ["an email that is not one", { email: "ada" }],
    ["a stale form with no key", { idempotencyKey: "" }],
    ["a shipping method the shop does not have", { shippingMethod: "express" }],
    ["a payment method the shop does not take", { paymentMethod: "card" }],
    ["a lower-case or long country code", { shipping: { ...address, countryCode: "cn" } }],
    ["a blank required box", { shipping: { ...address, city: "   " } }],
    ["a name past its bound", { shipping: { ...address, firstName: "x".repeat(CHECKOUT_NAME_MAX + 1) } }],
  ])("refuses %s", (_, over) => {
    expect(CheckoutSchema.safeParse({ ...submission, ...over }).success).toBe(false);
  });
});

describe("ProductSnapshotSchema", () => {
  it("is what an order line stores about its product", () => {
    expect(
      ProductSnapshotSchema.safeParse({
        productId: "p",
        name: "Earbuds",
        sku: "SKU-1",
        options: [{ option: "Color", value: "red" }],
        imageId: null,
      }).success,
    ).toBe(true);
    expect(ProductSnapshotSchema.safeParse({ name: "Earbuds" }).success).toBe(false);
  });
});
