import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Cart, CartItem } from "@my-ecommerce/shared";
import { displayCurrency } from "@/lib/currency/display";
import { en } from "@/lib/i18n/messages/en";
import { CartMenu } from "./cart-menu";

// "Remove" posts to a Server Action, which reaches the database.
vi.mock("@/app/[lang]/cart/actions", () => ({ updateCartLineAction: vi.fn() }));

const usd = (amount: string) => ({ amount, currency: "USD" });

const line = (over: Partial<CartItem> & { id: string }): CartItem => ({
  quantity: 2,
  variant: {
    id: `var_${over.id}`,
    sku: "SKU-1",
    price: usd("19.00"),
    compareAtPrice: null,
    stock: 10,
    inStock: true,
    optionValues: [{ id: "val_white", name: "White" }],
  },
  optionValues: [
    { id: "val_white", name: "White", option: "Color" },
    { id: "val_m", name: "M", option: "Size" },
  ],
  product: {
    id: "prod_1",
    slug: "headphone",
    name: "Headphone Wireless",
    image: { id: "m", url: "/media/m", alt: null, width: null, height: null, position: 0 },
    categories: [{ id: "cat_1", slug: "audio", name: "Audio" }],
  },
  lineTotal: usd("38.00"),
  unavailableReason: null,
  ...over,
});

const cart = (...items: CartItem[]): Cart => ({
  id: "cart_1",
  currency: "USD",
  items,
  itemCount: 2,
  subtotal: usd("38.00"),
  discountTotal: usd("0"),
  shippingTotal: null,
  taxTotal: null,
  grandTotal: usd("38.00"),
});

const render = (value: Cart | null, amount = "$38.00") =>
  renderToStaticMarkup(
    <CartMenu
      cart={value}
      amount={amount}
      messages={en}
      locale="en"
      currency={displayCurrency([])}
    />,
  );

describe("CartMenu", () => {
  it("draws a line as the design writes it: name - options, and quantity × price", () => {
    const markup = render(cart(line({ id: "a" })));

    expect(markup).toContain("Headphone Wireless - White / M");
    expect(markup).toMatch(/2 ×.*\$19\.00/);
    expect(markup).toContain('href="/en/products/audio/headphone"');
  });

  it("removes a line with the cart page's own action, quantity zero", () => {
    const markup = render(cart(line({ id: "a" })));

    expect(markup).toContain('name="itemId" value="a"');
    expect(markup).toMatch(/value="0" aria-label="Remove Headphone Wireless from your cart"/);
  });

  it("sums up, and leads on to the cart and to checkout", () => {
    const markup = render(cart(line({ id: "a" })));

    expect(markup).toContain("Subtotal:");
    expect(markup).toMatch(/href="\/en\/cart"[^>]*>View cart</);
    expect(markup).toMatch(/href="\/en\/checkout"[^>]*>Checkout</);
  });

  it("rules off and spaces the lines after the first", () => {
    const markup = render(cart(line({ id: "a" }), line({ id: "b" })));

    expect(
      markup.match(/<li class="[^"]*"/g)?.map((tag) => tag.includes("border-t") && tag.includes("pt-4")),
    ).toEqual([false, true]);
  });

  it("goes nowhere when nothing in the cart can be bought", () => {
    const markup = render({
      ...cart(line({ id: "a", unavailableReason: "outOfStock" })),
      itemCount: 0,
    });

    expect(markup).not.toContain('href="/en/checkout"');
    expect(markup).toMatch(/<span aria-disabled="true"[^>]*>Checkout</);
  });

  it("names a line without options by its product alone", () => {
    const markup = render(cart(line({ id: "a", optionValues: [] })));

    expect(markup).toContain(">Headphone Wireless</a>");
  });

  it("strikes the price of a line that cannot be bought", () => {
    expect(render(cart(line({ id: "a", unavailableReason: "outOfStock" })))).toContain(
      "line-through",
    );
  });

  it("says the cart is empty rather than drawing an empty list", () => {
    for (const value of [null, cart()]) {
      const markup = render(value, "$0.00");

      expect(markup).toContain("Your cart is empty.");
      expect(markup).not.toContain("Subtotal:");
    }
  });

  it("opens on hover and on keyboard focus, from the bar width up", () => {
    const panel = render(cart(line({ id: "a" }))).match(/<div class="([^"]*invisible[^"]*)"/)?.[1];

    expect(panel).toContain("group-hover:visible");
    expect(panel).toContain("group-focus-within:visible");
    // Not on a phone, where the tap should simply follow the link.
    expect(panel?.split(" ")).toEqual(expect.arrayContaining(["hidden", "bar:block"]));
  });
});
