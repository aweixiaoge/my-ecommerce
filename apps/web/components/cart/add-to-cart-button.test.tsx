import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { en } from "@/lib/i18n/messages/en";
import { AddToCartButton } from "./add-to-cart-button";

/**
 * The button, pressed the way a shopper presses it.
 *
 * The Server Action is mocked and only it: what is under test is what the form
 * sends and what the button says about the answer — the add itself is the
 * repository's, tested against it directly.
 */
const actions = vi.hoisted(() => ({ addToCart: vi.fn() }));

// See `review-form.test.tsx`: this file drives React deliberately.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/app/[lang]/cart/actions", () => ({ addToCartAction: actions.addToCart }));

let container: HTMLDivElement;
let root: Root;

function mount(props: Partial<Parameters<typeof AddToCartButton>[0]> = {}) {
  if (root) act(() => root.unmount());
  container?.remove();

  container = document.createElement("div");
  document.body.append(container);

  act(() => {
    root = createRoot(container);
    root.render(
      <AddToCartButton
        target={{ variantId: "var_1" }}
        label="Add to cart"
        messages={en.cart.add}
        cartHref="/en/cart"
        placement="page"
        className="button"
        {...props}
      />,
    );
  });
}

beforeEach(() => {
  actions.addToCart.mockReset();
  mount();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const button = () => container.querySelector("button")!;
const status = () => container.querySelector('[role="status"]')!;

/** A `submit` event rather than a click — see `review-form.test.tsx`. */
async function submit() {
  await act(async () => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

const submitted = () => actions.addToCart.mock.calls[0]?.[1] as FormData | undefined;

describe("what the button sends", () => {
  it("sends the variant from a product page", async () => {
    actions.addToCart.mockResolvedValue({ status: "added", quantity: 1 });

    await submit();

    expect(submitted()?.get("variantId")).toBe("var_1");
    expect(submitted()?.get("productId")).toBeNull();
  });

  it("sends the product from a card", async () => {
    mount({ target: { productId: "prod_1" }, placement: "card" });
    actions.addToCart.mockResolvedValue({ status: "added", quantity: 1 });

    await submit();

    expect(submitted()?.get("productId")).toBe("prod_1");
    expect(submitted()?.get("variantId")).toBeNull();
  });

  it("is disabled when there is nothing to add", () => {
    mount({ disabled: true, label: "Sold out" });

    expect(button().disabled).toBe(true);
    expect(button().textContent).toBe("Sold out");
  });
});

describe("what the button says back", () => {
  it("says nothing before it is pressed", () => {
    expect(status().textContent).toBe("");
  });

  it("says it was added, and offers the way to the cart", async () => {
    actions.addToCart.mockResolvedValue({ status: "added", quantity: 1 });

    await submit();

    expect(status().textContent).toContain("Added to your cart.");
    expect(status().querySelector("a")?.getAttribute("href")).toBe("/en/cart");
  });

  it("says how many there were when stock ran out", async () => {
    actions.addToCart.mockResolvedValue({ status: "limited", quantity: 3 });

    await submit();

    expect(status().textContent).toContain("Only 3 in stock");
    expect(status().querySelector("a")).not.toBeNull();
  });

  it.each([
    ["outOfStock", "Sold out — nothing was added."],
    ["unavailable", "This item is no longer for sale."],
    ["failed", "This could not be added to your cart. Please try again."],
  ])("explains a %s refusal, with no cart link", async (outcome, sentence) => {
    actions.addToCart.mockResolvedValue({ status: outcome });

    await submit();

    expect(status().textContent).toBe(sentence);
    expect(status().querySelector("a")).toBeNull();
  });

  it("reads as adding, and cannot be pressed twice, while the action is in flight", async () => {
    let finish!: (value: unknown) => void;
    actions.addToCart.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    await submit();

    expect(button().textContent).toBe("Adding…");
    expect(button().disabled).toBe(true);

    await act(async () => finish({ status: "added", quantity: 1 }));

    expect(button().textContent).toBe("Add to cart");
    expect(button().disabled).toBe(false);
  });

  it("sends the size beside the variant when there is one", async () => {
    mount({ target: { variantId: "var_1", optionValueId: "val_m" } });
    actions.addToCart.mockResolvedValue({ status: "added", quantity: 1 });

    await submit();

    expect(submitted()?.get("optionValueId")).toBe("val_m");
  });

  it("keeps a card's answer out of the card's flow", () => {
    mount({ placement: "card" });

    // The grid's rows are drawn to the card's fixed height; a sentence in the
    // flow would step the row.
    expect(status().className).toContain("absolute");
  });
});

describe("the counter", () => {
  const quantity = () => container.querySelector<HTMLInputElement>('input[name="quantity"]');

  /** Types into the box the way a browser does — see `review-form.test.tsx`. */
  async function typeInto(value: string) {
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(quantity()!, value);
      quantity()!.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  async function leave() {
    await act(async () => {
      quantity()!.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });
  }

  it("is not drawn on a card", () => {
    mount({ placement: "card", target: { productId: "prod_1" } });

    expect(quantity()).toBeNull();
  });

  it("posts the quantity typed", async () => {
    mount({ quantityMax: 10 });
    actions.addToCart.mockResolvedValue({ status: "added", quantity: 4 });

    await typeInto("4");
    await submit();

    expect(submitted()?.get("quantity")).toBe("4");
  });

  it.each([
    ["25", "10"],
    ["0", "1"],
    ["", "1"],
  ])("pulls a typed %j back to %j when the box is left", async (typed, kept) => {
    mount({ quantityMax: 10 });

    await typeInto(typed);
    await leave();

    expect(quantity()!.value).toBe(kept);
  });

  it("never offers more than a line may hold, whatever the stock", () => {
    mount({ quantityMax: 5000 });

    expect(quantity()!.max).toBe("99");
  });

  it("is disabled with the button when there is nothing to add", () => {
    mount({ quantityMax: 0, disabled: true });

    expect(quantity()!.disabled).toBe(true);
    expect(quantity()!.max).toBe("1");
  });
});
