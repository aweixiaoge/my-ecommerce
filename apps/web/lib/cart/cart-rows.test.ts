import { describe, expect, it, vi } from "vitest";
import { cartSelect, toCart, type CartRow } from "./cart-rows";

// Nothing here queries, but the catalog's media module imports the client, and
// importing the real one demands a connection string.
vi.mock("@my-ecommerce/db", () => ({ prisma: {} }));

/**
 * The cart's figures, with no database near them.
 *
 * Every number on the cart page is decided here — the line totals, which lines
 * count, and the subtotal — so this is where a cent going missing would show.
 */

type ItemRow = CartRow["items"][number];

const decimal = (value: string) => ({ toString: () => value });

/** A line as `cartSelect` returns one: a priced, in-stock variant of an active product. */
function item(over: {
  id?: string;
  quantity?: number;
  price?: string | null;
  currency?: string | null;
  sku?: string | null;
  stock?: number;
  status?: "active" | "draft" | "archived";
  translations?: { name: string; slug: string; locale: string }[];
  variantMedia?: { id: string; position: number }[];
  productMedia?: { id: string; position: number }[];
  /** The size, at option position 1 — after the colour. */
  size?: string;
} = {}): ItemRow {
  return {
    id: over.id ?? "item_1",
    quantity: over.quantity ?? 1,
    optionValue: over.size
      ? {
          id: `val_${over.size}`,
          option: { position: 1, translations: [{ name: "Size", locale: "en" }] },
          translations: [{ name: over.size, locale: "en" }],
        }
      : null,
    variant: {
      id: `var_${over.id ?? "item_1"}`,
      sku: over.sku === undefined ? "SKU-1" : over.sku,
      priceAmount: over.price === null ? null : decimal(over.price ?? "24.45"),
      priceCurrency: over.currency === undefined ? "USD" : over.currency,
      stock: over.stock ?? 10,
      optionValues: [
        {
          optionValue: {
            id: "val_red",
            option: { position: 0, translations: [{ name: "Color", locale: "en" }, { name: "Farbe", locale: "de" }] },
            translations: [
              { name: "red", locale: "en" },
              { name: "rot", locale: "de" },
            ],
          },
        },
      ],
      media: over.variantMedia ?? [],
      product: {
        id: "prod_1",
        status: over.status ?? "active",
        translations: over.translations ?? [
          { name: "Earbuds", slug: "earbuds", locale: "en" },
        ],
        media: over.productMedia ?? [{ id: "media_product", position: 0 }],
        categories: [
          {
            category: {
              id: "cat_1",
              translations: [{ name: "Earphone", slug: "earphone", locale: "en" }],
            },
          },
        ],
      },
    },
  } as unknown as ItemRow;
}

const cart = (...items: ItemRow[]): CartRow => ({ id: "cart_1", items }) as CartRow;

describe("toCart", () => {
  it("prices a line from the variant, times its quantity", () => {
    const result = toCart(cart(item({ quantity: 3, price: "24.45" })), "en");

    expect(result.items[0]?.lineTotal).toEqual({ amount: "73.35", currency: "USD" });
    expect(result.items[0]?.variant.price).toEqual({ amount: "24.45", currency: "USD" });
  });

  it("adds the lines up exactly, and counts the units", () => {
    const result = toCart(
      cart(
        item({ id: "a", quantity: 2, price: "0.10" }),
        item({ id: "b", quantity: 1, price: "0.20" }),
      ),
      "en",
    );

    // 0.1 × 2 + 0.2 in floats is 0.4000000000000001.
    expect(result.subtotal).toEqual({ amount: "0.40", currency: "USD" });
    expect(result.grandTotal).toEqual(result.subtotal);
    expect(result.itemCount).toBe(3);
  });

  it("is an empty cart of zero when there are no lines", () => {
    const result = toCart(cart(), "en");

    expect(result).toMatchObject({
      id: "cart_1",
      currency: "USD",
      items: [],
      itemCount: 0,
      subtotal: { amount: "0", currency: "USD" },
      discountTotal: { amount: "0", currency: "USD" },
      shippingTotal: null,
      taxTotal: null,
    });
  });

  it.each([
    ["withdrawn", { status: "archived" as const }],
    ["withdrawn", { currency: "EUR" }],
    ["outOfStock", { stock: 0 }],
    ["limitedStock", { quantity: 5, stock: 3 }],
  ])("shows a %s line but leaves it out of the totals", (reason, over) => {
    const result = toCart(cart(item({ id: "ok", price: "10.00" }), item({ id: "bad", ...over })), "en");

    expect(result.items).toHaveLength(2);
    expect(result.items[1]?.unavailableReason).toBe(reason);
    expect(result.items[0]?.unavailableReason).toBeNull();
    expect(result.subtotal).toEqual({ amount: "10.00", currency: "USD" });
    expect(result.itemCount).toBe(1);
  });

  it("drops a line it cannot price or identify, rather than inventing either", () => {
    const result = toCart(
      cart(item({ id: "a", price: null }), item({ id: "b", sku: null }), item({ id: "c", currency: null })),
      "en",
    );

    expect(result.items).toEqual([]);
  });

  it("drops a line whose product has no name in either language", () => {
    expect(toCart(cart(item({ translations: [] })), "de").items).toEqual([]);
  });

  it("names the line in the reader's language, falling back to English", () => {
    const line = toCart(cart(item()), "de").items[0]!;

    expect(line.variant.optionValues).toEqual([{ id: "val_red", name: "rot" }]);
    // The option's name is translated too — "Farbe: rot", not "Color: rot".
    expect(line.optionValues).toEqual([{ id: "val_red", name: "rot", option: "Farbe" }]);
    // No German product row: the English name stands in rather than a blank.
    expect(line.product.name).toBe("Earbuds");
    expect(line.product.categories).toEqual([{ id: "cat_1", slug: "earphone", name: "Earphone" }]);
  });

  it("names a line by its colour and its size, in the page's order", () => {
    const line = toCart(cart(item({ size: "M" })), "en").items[0]!;

    expect(line.optionValues).toEqual([
      { id: "val_red", name: "red", option: "Color" },
      { id: "val_M", name: "M", option: "Size" },
    ]);
    // The variant is still only the colour: the size picks no variant.
    expect(line.variant.optionValues).toEqual([{ id: "val_red", name: "red" }]);
  });

  it("shows the variant's own photograph before the product's", () => {
    const own = toCart(cart(item({ variantMedia: [{ id: "media_red", position: 0 }] })), "en");
    const fallback = toCart(cart(item()), "en");
    const none = toCart(cart(item({ productMedia: [] })), "en");

    expect(own.items[0]?.product.image?.id).toBe("media_red");
    expect(fallback.items[0]?.product.image?.id).toBe("media_product");
    expect(none.items[0]?.product.image).toBeNull();
  });
});

describe("cartSelect", () => {
  it("never reads an image's bytes", () => {
    // `Media.data` is the JPEG itself; a cart of four lines must not pull four
    // photographs out of Postgres to draw four thumbnails.
    const select = cartSelect("en");
    const variant = select.items.select.variant.select;

    // The type is a few bytes, and it is what keeps a product video off a
    // cart line's thumbnail.
    expect(variant.media.select).toEqual({ id: true, position: true, mimeType: true });
    expect(variant.product.select.media.select).toEqual({ id: true, position: true, mimeType: true });
  });

  it("orders lines the way they went in, with a tie-break", () => {
    expect(cartSelect("en").items.orderBy).toEqual([{ createdAt: "asc" }, { id: "asc" }]);
  });
});
