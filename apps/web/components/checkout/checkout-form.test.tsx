import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { CartItem } from "@my-ecommerce/shared";
import { countryOptions, regionsFor } from "@/lib/checkout/countries";
import { displayCurrency } from "@/lib/currency/display";
import { en } from "@/lib/i18n/messages/en";
import { CheckoutForm } from "./checkout-form";

/**
 * The checkout, filled in the way a shopper fills it.
 *
 * The Server Action is mocked and only it: under test is what the form shows
 * as the address is typed, what it sends, and what it does with a refusal.
 */
const actions = vi.hoisted(() => ({ placeOrder: vi.fn(), applyCoupon: vi.fn() }));

// See `review-form.test.tsx`: this file drives React deliberately.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/app/[lang]/checkout/actions", () => ({
  placeOrderAction: actions.placeOrder,
  applyCouponAction: actions.applyCoupon,
}));

const usd = (amount: string) => ({ amount, currency: "USD" });

const item: CartItem = {
  id: "item_1",
  quantity: 2,
  variant: {
    id: "var_1",
    sku: "SKU-1",
    price: usd("18.00"),
    compareAtPrice: null,
    stock: 10,
    inStock: true,
    optionValues: [{ id: "val_blue", name: "Blue" }],
  },
  optionValues: [{ id: "val_blue", name: "Blue", option: "Color" }],
  product: { id: "prod_1", slug: "earbud", name: "Earbud Wireless", image: null, categories: [] },
  lineTotal: usd("36.00"),
  unavailableReason: null,
};

let container: HTMLDivElement;
let root: Root;

function mount(hasUnavailable = false) {
  if (root) act(() => root.unmount());
  container?.remove();
  container = document.createElement("div");
  document.body.append(container);

  act(() => {
    root = createRoot(container);
    root.render(
      <CheckoutForm
        locale="en"
        idempotencyKey="4b0c5c3e-6a8f-4f45-9d6e-1f2a3b4c5d6e"
        countries={countryOptions("en").map((country) => ({
          ...country,
          regions: regionsFor(country.code),
        }))}
        defaultCountry="CN"
        items={[item]}
        subtotal={usd("36.00")}
        hasUnavailable={hasUnavailable}
        currency={displayCurrency([])}
        messages={en.checkout}
        cartMessages={{
          coupons: en.cart.coupons,
          optionLabel: en.cart.optionLabel,
        }}
        cartHref="/en/cart"
      />,
    );
  });
}

beforeEach(() => {
  actions.placeOrder.mockReset();
  actions.applyCoupon.mockReset();
  mount();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const field = <T extends HTMLElement>(name: string) =>
  container.querySelector<T>(`[name="${name}"]`);

/** Sets a controlled box's value the way a browser does — see `review-form.test.tsx`. */
async function type(name: string, value: string) {
  const element = field<HTMLInputElement | HTMLSelectElement>(name)!;
  await act(async () => {
    const prototype = Object.getPrototypeOf(element);
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
}

async function click(element: HTMLElement) {
  await act(async () => element.click());
}

async function submit() {
  await act(async () => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

const text = () => container.textContent ?? "";
const summary = () => container.querySelector("aside")!.textContent ?? "";

async function fillShipping() {
  await type("shipping.firstName", "Ada");
  await type("shipping.lastName", "Lovelace");
  await type("shipping.line1", "1 Century Avenue");
  await type("shipping.city", "Shanghai");
  await type("shipping.region", "Shanghai");
  await type("shipping.postalCode", "200120");
}

describe("the summary", () => {
  it("lists the order with its quantity badge, its options and the totals", () => {
    expect(summary()).toContain("Earbud Wireless");
    expect(summary()).toContain("Color: Blue");
    expect(container.querySelector('[aria-label="Quantity: 2"]')?.textContent).toBe("2");
    expect(summary()).toContain("$36.00");
  });

  it("waits for an address before it prices delivery", () => {
    expect(summary()).toContain("Enter address to calculate");
    expect(text()).toContain("Enter a shipping address to view shipping options.");
  });
});

describe("the shipping address", () => {
  it("prices delivery and offers the shipping option once it is complete", async () => {
    await fillShipping();

    // $36.00 is under the $50 threshold: $5.00 standard delivery.
    expect(text()).toContain("Standard delivery");
    expect(field<HTMLInputElement>("shippingMethod")?.checked).toBe(true);
    expect(summary()).toContain("$5.00");
    expect(summary()).toContain("$41.00");
  });

  it("opens on China with its provinces, and follows the country chosen", async () => {
    expect(field<HTMLSelectElement>("shipping.countryCode")?.value).toBe("CN");
    expect(field<HTMLSelectElement>("shipping.region")?.tagName).toBe("SELECT");
    expect(text()).toContain("Select a province");

    await type("shipping.region", "Shanghai");
    await type("shipping.countryCode", "US");
    // A Chinese province is not an American state: the choice is cleared.
    expect(field<HTMLSelectElement>("shipping.region")?.value).toBe("");
    expect(text()).toContain("Select a state");

    await type("shipping.countryCode", "DE");
    expect(field<HTMLInputElement>("shipping.region")?.tagName).toBe("INPUT");
    expect(text()).toContain("State / Region (optional)");
  });

  it("does not ask for a province where there is no list", async () => {
    await type("shipping.countryCode", "DE");
    await type("shipping.firstName", "Ada");
    await type("shipping.lastName", "Lovelace");
    await type("shipping.line1", "Unter den Linden 1");
    await type("shipping.city", "Berlin");
    await type("shipping.postalCode", "10117");

    expect(text()).toContain("Standard delivery");
  });

  it("shows the apartment line behind its +", async () => {
    expect(field("shipping.line2")).toBeNull();

    const button = [...container.querySelectorAll("button")].find((candidate) =>
      candidate.textContent?.startsWith("+ Add apartment"),
    )!;
    await click(button);

    expect(field("shipping.line2")).not.toBeNull();
  });
});

describe("billing and the note", () => {
  it("asks for a billing address until it is the shipping one", async () => {
    expect(field("billing.firstName")).not.toBeNull();

    await click(field<HTMLInputElement>("billingSameAsShipping")!);

    expect(field("billing.firstName")).toBeNull();
  });

  it("opens the note box when asked for one", async () => {
    expect(field("note")).toBeNull();

    await click(field<HTMLInputElement>("addNote")!);

    expect(field("note")).not.toBeNull();
  });

  it("inks the payment option once it is chosen", async () => {
    const radio = field<HTMLInputElement>("paymentMethod")!;
    expect(radio.closest("div")?.className).toContain("border-line");

    await click(radio);

    expect(radio.checked).toBe(true);
    expect(radio.closest("div")?.className).toContain("border-ink");
  });
});

describe("placing the order", () => {
  it("sends the form with its language and its key", async () => {
    actions.placeOrder.mockResolvedValue({});
    await fillShipping();

    await submit();

    const data = actions.placeOrder.mock.calls[0]?.[1] as FormData;
    expect(data.get("locale")).toBe("en");
    expect(data.get("idempotencyKey")).toBe("4b0c5c3e-6a8f-4f45-9d6e-1f2a3b4c5d6e");
    expect(data.get("shipping.city")).toBe("Shanghai");
    expect(data.get("shippingMethod")).toBe("standard");
  });

  it("puts each refusal under its box, and keeps what was typed", async () => {
    actions.placeOrder.mockResolvedValue({
      message: "Some details need another look.",
      errors: { email: "Enter a valid email address.", "shipping.city": "This field is required." },
    });
    await type("shipping.firstName", "Ada");

    await submit();

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Some details need another look.",
    );
    const email = field<HTMLInputElement>("email")!;
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(email.getAttribute("aria-describedby")!)?.textContent).toBe(
      "Enter a valid email address.",
    );
    expect(field<HTMLInputElement>("shipping.firstName")?.value).toBe("Ada");
  });

  it("marks a refused dropdown the way it marks a refused box", async () => {
    actions.placeOrder.mockResolvedValue({
      errors: { "shipping.region": "Choose one from the list." },
    });

    await submit();

    const region = field<HTMLSelectElement>("shipping.region")!;
    expect(region.getAttribute("aria-invalid")).toBe("true");
    expect(region.className).toContain("border-danger");
    expect(document.getElementById(region.getAttribute("aria-describedby")!)?.textContent).toBe(
      "Choose one from the list.",
    );
  });

  it("offers the way back to the cart when stock ran out", async () => {
    actions.placeOrder.mockResolvedValue({ message: "Some items sold out.", reviewCart: true });

    await submit();

    expect(container.querySelector('[role="alert"] a')?.getAttribute("href")).toBe("/en/cart");
  });

  it("reads as placing while the action is in flight", async () => {
    let finish!: (value: unknown) => void;
    actions.placeOrder.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    await submit();
    const button = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(button.textContent).toBe("Placing order…");
    expect(button.disabled).toBe(true);

    await act(async () => finish({}));
    expect(button.textContent).toBe("Place Order");
  });

  it("says when some of the cart is not part of the order", () => {
    mount(true);

    expect(text()).toContain("Some items in your cart can no longer be bought");
  });
});

describe("coupons", () => {
  const applyButton = () =>
    [...container.querySelectorAll<HTMLButtonElement>("aside button")].find(
      (button) => button.textContent === "Apply",
    )!;

  async function applyCode(code: string) {
    await type("couponEntry", code);
    await click(applyButton());
  }

  it("takes the previewed discount off the total and sends only the code", async () => {
    actions.applyCoupon.mockResolvedValue({ status: "applied", code: "SAVE10", discount: usd("3.60") });
    actions.placeOrder.mockResolvedValue({});

    await applyCode("save10");

    expect(actions.applyCoupon).toHaveBeenCalledWith("en", "save10");
    expect(summary()).toContain("Coupon SAVE10 applied");
    expect(summary()).toContain("Discount (SAVE10)−$3.60");
    expect(summary()).toMatch(/Total\$32\.40/);

    await fillShipping();
    // 36.00 − 3.60 + 5.00 delivery: the threshold reads the undiscounted subtotal.
    expect(summary()).toMatch(/Total\$37\.40/);

    await submit();
    const data = actions.placeOrder.mock.calls[0]?.[1] as FormData;
    expect(data.get("couponCode")).toBe("SAVE10");
  });

  it("says why a code took nothing off, under the box", async () => {
    actions.applyCoupon.mockResolvedValue({ status: "expired" });

    await applyCode("OLD");

    const box = field<HTMLInputElement>("couponEntry")!;
    expect(box.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(box.getAttribute("aria-describedby")!)?.textContent).toBe(
      "This coupon has expired.",
    );
    expect(summary()).not.toContain("Discount");
  });

  it("asks for a code before asking the server", async () => {
    await click(applyButton());

    expect(actions.applyCoupon).not.toHaveBeenCalled();
    expect(summary()).toContain("Enter a coupon code.");
  });

  it("applies on Enter instead of placing the order", async () => {
    actions.applyCoupon.mockResolvedValue({ status: "unknown" });
    await type("couponEntry", "NOPE");

    await act(async () => {
      field<HTMLInputElement>("couponEntry")!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
      );
    });

    expect(actions.applyCoupon).toHaveBeenCalledWith("en", "NOPE");
    expect(actions.placeOrder).not.toHaveBeenCalled();
  });

  it("removes an applied coupon, and with it the discount", async () => {
    actions.applyCoupon.mockResolvedValue({ status: "applied", code: "SAVE10", discount: usd("3.60") });
    actions.placeOrder.mockResolvedValue({});
    await applyCode("SAVE10");

    const remove = [...container.querySelectorAll<HTMLButtonElement>("aside button")].find(
      (button) => button.textContent === "Remove",
    )!;
    container.querySelector("details")!.open = true;
    await click(remove);

    // Still open, ready for another code.
    expect(container.querySelector("details")!.open).toBe(true);
    expect(summary()).not.toContain("Discount");
    expect(summary()).toMatch(/Total\$36\.00/);
    await submit();
    expect((actions.placeOrder.mock.calls[0]?.[1] as FormData).has("couponCode")).toBe(false);
  });

  it("drops a coupon that placing refused, and says why", async () => {
    actions.applyCoupon.mockResolvedValue({ status: "applied", code: "SAVE10", discount: usd("3.60") });
    actions.placeOrder.mockResolvedValue({
      message: en.checkout.errors.couponRefused,
      errors: { couponCode: "This coupon has expired." },
      couponRefused: true,
    });
    await applyCode("SAVE10");

    await submit();

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Your coupon can no longer be used",
    );
    expect(summary()).not.toContain("Discount (SAVE10)");
    expect(summary()).toContain("This coupon has expired.");
  });
});
