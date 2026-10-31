import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Cart, CartItem } from "@my-ecommerce/shared";
import { displayCurrency } from "@/lib/currency/display";
import { en } from "@/lib/i18n/messages/en";
import { CartView } from "./cart-view";

// The controls post to a Server Action, which reaches the database. What the
// page draws is what is under test; the action is tested on its own.
vi.mock("@/app/[lang]/cart/actions", () => ({ updateCartLineAction: vi.fn() }));

const usd = (amount: string) => ({ amount, currency: "USD" });

const line = (over: Partial<CartItem> & { id: string }): CartItem => ({
  quantity: 2,
  variant: {
    id: `var_${over.id}`,
    sku: "SKU-1",
    price: usd("24.45"),
    compareAtPrice: null,
    stock: 10,
    inStock: true,
    optionValues: [{ id: "val_red", name: "red" }],
  },
  optionValues: [
    { id: "val_red", name: "red", option: "Color" },
    { id: "val_m", name: "M", option: "Size" },
  ],
  product: {
    id: "prod_1",
    slug: "earbuds",
    name: "Earbuds",
    image: null,
    categories: [{ id: "cat_1", slug: "earphone", name: "Earphone" }],
  },
  lineTotal: usd("48.90"),
  unavailableReason: null,
  ...over,
});

const cart = (...items: CartItem[]): Cart => ({
  id: "cart_1",
  currency: "USD",
  items,
  itemCount: 2,
  subtotal: usd("48.90"),
  discountTotal: usd("0"),
  shippingTotal: null,
  taxTotal: null,
  grandTotal: usd("48.90"),
});

const render = (value: Cart, currency = displayCurrency([])) =>
  renderToStaticMarkup(
    <CartView cart={value} messages={en.cart} locale="en" currency={currency} />,
  );

describe("CartView", () => {
  it("draws a line: its name, its options, its price and its total", () => {
    const markup = render(cart(line({ id: "a" })));

    expect(markup).toContain("Earbuds");
    // The colour and the size the shopper chose, each under its option's name,
    // in the product page's order.
    expect(markup).toMatch(/<p[^>]*>Color: red<\/p><p[^>]*>Size: M<\/p>/);
    expect(markup).toContain("$24.45");
    expect(markup).toContain("$48.90");
    // Linked where the shop card links it: under its first category.
    expect(markup).toContain('href="/en/products/earphone/earbuds"');
  });

  it("gives each button the quantity it means", () => {
    const markup = render(cart(line({ id: "a" })));

    expect(markup).toContain('name="itemId" value="a"');
    expect(markup).toMatch(/value="1" aria-label="One fewer Earbuds"/);
    expect(markup).toMatch(/value="3" aria-label="One more Earbuds"/);
    expect(markup).toMatch(/value="0" aria-label="Remove Earbuds from your cart"/);
  });

  it("will not raise a line past what is in stock", () => {
    const markup = render(
      cart(line({ id: "a", quantity: 3, variant: { ...line({ id: "a" }).variant, stock: 3 } })),
    );

    expect(markup).toMatch(/aria-label="One more Earbuds" disabled=""/);
  });

  it("says why a line is held back, and strikes its total", () => {
    const base = line({ id: "a" });
    const markup = render(
      cart(
        { ...base, id: "w", unavailableReason: "withdrawn" },
        { ...base, id: "o", unavailableReason: "outOfStock" },
        {
          ...base,
          id: "l",
          quantity: 5,
          variant: { ...base.variant, stock: 3 },
          unavailableReason: "limitedStock",
        },
      ),
    );

    expect(markup).toContain("No longer available. Remove it to check out.");
    expect(markup).toContain("Sold out. Remove it to check out.");
    expect(markup).toContain("Only 3 left. Lower the quantity to check out.");
    expect(markup.match(/line-through/g)).toHaveLength(3);
  });

  it("lays the lines out as a table of Product and Total", () => {
    const markup = render(cart(line({ id: "a" })));

    expect(markup).toMatch(/<th colSpan="2" scope="col"[^>]*>Product<\/th>/);
    expect(markup).toMatch(/<th scope="col"[^>]*>Total<\/th>/);
    expect(markup.match(/<tr /g)).toHaveLength(2);
  });

  it("estimates the total, and leads on to checkout", () => {
    const markup = render(cart(line({ id: "a" })));

    expect(markup).toContain("Cart totals");
    expect(markup).toMatch(/Estimated total<\/span><span[^>]*>\$48\.90</);
    expect(markup).toMatch(/href="\/en\/checkout"[^>]*>Proceed to Checkout</);
  });

  it("goes nowhere when nothing in the cart can be bought", () => {
    // Every line has an issue: checkout would have nothing to order.
    const markup = render({
      ...cart(line({ id: "a", unavailableReason: "outOfStock" })),
      itemCount: 0,
    });

    expect(markup).not.toContain('href="/en/checkout"');
    expect(markup).toMatch(/<span aria-disabled="true"[^>]*>Proceed to Checkout</);
  });

  it("offers coupons as the design's disclosure, pointing at the checkout", () => {
    const markup = render(cart(line({ id: "a" })));

    expect(markup).toMatch(/<details[^>]*><summary[^>]*>Add coupons/);
    expect(markup).toContain("Enter your coupon code at checkout.");
  });

  it("ships free at the trust bar's threshold, and defers below it", () => {
    const over = { ...cart(line({ id: "a" })), subtotal: usd("50.00"), grandTotal: usd("50.00") };

    expect(render(over)).toMatch(/Free shipping<\/span><span class="[^"]*uppercase[^"]*">Free</);
    // The fixture's $48.90 is under $50.00.
    expect(render(cart(line({ id: "a" })))).toMatch(
      /Shipping<\/span><span class="text-ink-62">Calculated at checkout</,
    );
  });

  it("writes every figure in the reader's currency", () => {
    const markup = render(
      cart(line({ id: "a" })),
      displayCurrency([{ base: "USD", quote: "EUR", rate: "0.92" }], "EUR"),
    );

    // 24.45 × 0.92 = 22.494 → €22.49; 48.90 × 0.92 = 44.988 → €44.99.
    expect(markup).toContain("€22.49");
    expect(markup).toContain("€44.99");
    // Not a bare "$": React's form-replay script carries `$$reactFormReplay`.
    expect(markup).not.toMatch(/\$\d/);
  });

  it("shows the photograph, and an empty square when there is none", () => {
    const base = line({ id: "a" });
    const without = render(cart(base));
    const withImage = render(
      cart({
        ...base,
        product: {
          ...base.product,
          image: { id: "m", url: "/media/m", alt: null, width: null, height: null, position: 0 },
        },
      }),
    );

    expect(without).not.toContain('alt="Earbuds"');
    expect(without).toMatch(/size-\[64px\][^"]*" href="[^"]*"><\/a>/);
    expect(withImage).toContain('alt="Earbuds"');
  });

  it("leaves out option lines for a product with no options", () => {
    const base = line({ id: "a" });
    const markup = render(cart({ ...base, optionValues: [] }));

    // The price is followed straight by the quantity form.
    expect(markup).toMatch(/<p[^>]*>\$24\.45<\/p><form/);
  });

  it("writes a value whose option has no name on its own, and skips a blank one", () => {
    const base = line({ id: "a" });
    const markup = render(
      cart({
        ...base,
        optionValues: [
          { id: "v1", name: "red", option: "" },
          { id: "v2", name: "", option: "Size" },
        ],
      }),
    );

    expect(markup).toMatch(/<p[^>]*>red<\/p>/);
    expect(markup).not.toContain("Size:");
  });
});
