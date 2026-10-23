import { describe, expect, it } from "vitest";
import {
  CART_LINE_QUANTITY_MAX,
  CartAddSchema,
  CartLineUpdateSchema,
  CartSchema,
} from "./cart";

describe("CartAddSchema", () => {
  it("accepts a variant, as a product page sends it", () => {
    const result = CartAddSchema.safeParse({ variantId: "var_1", quantity: "2" });

    expect(result.success).toBe(true);
    // Coerced, because a form field is a string.
    expect(result.success && result.data).toEqual({ variantId: "var_1", quantity: 2 });
  });

  it("carries the size beside the variant", () => {
    const result = CartAddSchema.safeParse({ variantId: "var_1", optionValueId: "val_m" });

    expect(result.success && result.data).toEqual({
      variantId: "var_1",
      optionValueId: "val_m",
      quantity: 1,
    });
  });

  it("accepts a product, as a shop card sends it, and means one of it", () => {
    const result = CartAddSchema.safeParse({ productId: "prod_1" });

    expect(result.success && result.data).toEqual({ productId: "prod_1", quantity: 1 });
  });

  it("refuses neither id, and both — the server must not guess which was meant", () => {
    expect(CartAddSchema.safeParse({}).success).toBe(false);
    expect(
      CartAddSchema.safeParse({ variantId: "var_1", productId: "prod_1" }).success,
    ).toBe(false);
  });

  it.each(["0", "-1", "1.5", "abc", String(CART_LINE_QUANTITY_MAX + 1)])(
    "refuses the quantity %j",
    (quantity) => {
      expect(CartAddSchema.safeParse({ variantId: "var_1", quantity }).success).toBe(false);
    },
  );

  it("refuses an id longer than any id this database mints", () => {
    expect(CartAddSchema.safeParse({ variantId: "x".repeat(65) }).success).toBe(false);
  });
});

describe("CartLineUpdateSchema", () => {
  it("accepts zero, which removes the line", () => {
    const result = CartLineUpdateSchema.safeParse({ itemId: "item_1", quantity: "0" });

    expect(result.success && result.data).toEqual({ itemId: "item_1", quantity: 0 });
  });

  it("refuses a missing item and an out-of-range quantity", () => {
    expect(CartLineUpdateSchema.safeParse({ itemId: "", quantity: "1" }).success).toBe(false);
    expect(CartLineUpdateSchema.safeParse({ itemId: "i", quantity: "-1" }).success).toBe(false);
    expect(
      CartLineUpdateSchema.safeParse({ itemId: "i", quantity: String(CART_LINE_QUANTITY_MAX + 1) })
        .success,
    ).toBe(false);
  });
});

describe("CartSchema", () => {
  it("refuses a line issue that is a sentence rather than a code", () => {
    const usd = (amount: string) => ({ amount, currency: "USD" });
    const cart = {
      id: "cart_1",
      currency: "USD",
      itemCount: 0,
      subtotal: usd("0"),
      discountTotal: usd("0"),
      shippingTotal: null,
      taxTotal: null,
      grandTotal: usd("0"),
      items: [
        {
          id: "item_1",
          quantity: 1,
          variant: {
            id: "var_1",
            sku: "SKU-1",
            price: usd("10.00"),
            compareAtPrice: null,
            stock: 0,
            inStock: false,
            optionValues: [],
          },
          optionValues: [{ id: "val_m", name: "M", option: "Size" }],
          product: { id: "p", slug: "p", name: "P", image: null, categories: [] },
          lineTotal: usd("10.00"),
          unavailableReason: "outOfStock",
        },
      ],
    };

    expect(CartSchema.safeParse(cart).success).toBe(true);

    cart.items[0]!.unavailableReason = "Sold out";
    expect(CartSchema.safeParse(cart).success).toBe(false);
  });
});
