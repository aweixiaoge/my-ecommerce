import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Media, Product, Variant } from "@my-ecommerce/shared";
import { ProductPurchase } from "./product-purchase";

/*
 * The picker, driven the way a shopper drives it.
 *
 * A real DOM rather than rendered markup, because the point of this component
 * is what happens *after* a click — and plain DOM queries rather than a testing
 * library, which this project does not have and does not need for finding a
 * button by its label.
 */

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src?: unknown; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : "mock"} alt={alt ?? ""} />
  ),
}));

const media = (id: string, position = 0): Media => ({
  id,
  url: `/media/${id}`,
  alt: null,
  width: null,
  height: null,
  position,
});

const variant = (over: Partial<Variant> & { id: string }): Variant => ({
  sku: `SKU-${over.id}`,
  price: { amount: "10.00", currency: "USD" },
  compareAtPrice: null,
  stock: 5,
  inStock: true,
  optionValues: [],
  ...over,
});

/**
 * Two colours and a size.
 *
 * The shape the admin actually writes: one variant per colour, and a Size
 * option that no variant stands behind. That last part is the case worth
 * having, because it is the one a naive "match every chosen value" rule gets
 * wrong.
 */
const product: Product = {
  id: "prod_1",
  slug: "studio-over-ear",
  name: "Studio Over-Ear",
  description: "## Materials",
  shortDescription: "Closed-back.",
  price: { amount: "87.00", currency: "USD" },
  priceMax: { amount: "333.00", currency: "USD" },
  compareAtPrice: null,
  image: media("media_onyx"),
  images: [media("media_onyx"), media("media_onyx_2", 1), media("media_sand")],
  inStock: true,
  categories: [{ id: "cat_1", slug: "earphone", name: "Earphone" }],
  rating: null,
  variants: [
    variant({
      id: "var_onyx",
      sku: "23556-ew",
      price: { amount: "333.00", currency: "USD" },
      optionValues: [{ id: "val_onyx", name: "Onyx" }],
    }),
    variant({
      id: "var_sand",
      sku: "ssdwwe-12",
      price: { amount: "87.00", currency: "USD" },
      optionValues: [{ id: "val_sand", name: "Sand" }],
    }),
  ],
  options: [
    {
      id: "opt_color",
      name: "Color",
      position: 0,
      values: [
        { id: "val_onyx", name: "Onyx" },
        { id: "val_sand", name: "Sand" },
      ],
    },
    {
      id: "opt_size",
      name: "Size",
      position: 1,
      values: [{ id: "val_m", name: "M" }],
    },
  ],
  metaTitle: null,
  metaDescription: null,
};

const imagesByVariant = {
  var_onyx: [media("media_onyx"), media("media_onyx_2", 1)],
  var_sand: [media("media_sand")],
};

let container: HTMLDivElement;
let root: Root;

/**
 * Render the component against a fresh root.
 *
 * A new root every time, rather than re-rendering the existing one, because
 * what most of these tests are about is what the component chooses *when it
 * mounts* — and `useState`'s initial value only runs then. Re-rendering would
 * leave the first mount's selection in place and quietly assert nothing.
 */
function mount(
  over: Partial<Product> = {},
  images: Record<string, Media[]> = imagesByVariant,
) {
  if (root) act(() => root.unmount());
  container?.remove();

  container = document.createElement("div");
  document.body.append(container);

  act(() => {
    root = createRoot(container);
    root.render(
      <ProductPurchase product={{ ...product, ...over }} imagesByVariant={images} />,
    );
  });
}

beforeEach(() => {
  mount();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const buttons = () => [...container.querySelectorAll("button")];

/** A pill, addressed by the word on it. */
const pill = (label: string) => {
  const found = buttons().find((button) => button.textContent === label);
  if (!found) throw new Error(`no pill reading "${label}" is rendered`);
  return found;
};

const click = (element: HTMLElement) =>
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

/**
 * The price under the pills — the one the selection decides.
 *
 * Distinguished from the span above it by the en dash: both are paragraphs
 * starting with a dollar sign, and only one of them moves when a pill is
 * clicked.
 */
const selectedPrice = () =>
  [...container.querySelectorAll("p")]
    .map((p) => p.textContent ?? "")
    .find((text) => text.startsWith("$") && !text.includes("–"));

const skuLine = () => container.querySelector("dl")?.textContent ?? "";

/** The picture in the big frame — the first thing the gallery renders. */
const mainImage = () => container.querySelector("img")?.getAttribute("src");

/** The thumbnails under it, addressed by the label they carry. */
const thumbnails = () =>
  [...container.querySelectorAll<HTMLButtonElement>('button[aria-label^="Show image of"]')];

describe("what opens selected", () => {
  it("opens on the cheapest variant that can be bought", () => {
    // The card said what this product costs from; the page should not open on
    // the dearest colour and contradict it.
    expect(selectedPrice()).toBe("$87.00");
    expect(skuLine()).toContain("ssdwwe-12");
    expect(pill("Sand").getAttribute("aria-pressed")).toBe("true");
  });

  it("skips a cheaper variant that is sold out", () => {
    // Opening on a sold-out colour shows a page whose button is disabled for
    // no reason a shopper can see.
    mount({
      variants: [
        variant({
          id: "var_onyx",
          sku: "23556-ew",
          price: { amount: "9.00", currency: "USD" },
          stock: 0,
          inStock: false,
          optionValues: [{ id: "val_onyx", name: "Onyx" }],
        }),
        variant({
          id: "var_sand",
          sku: "ssdwwe-12",
          price: { amount: "87.00", currency: "USD" },
          optionValues: [{ id: "val_sand", name: "Sand" }],
        }),
      ],
    });

    expect(selectedPrice()).toBe("$87.00");
    expect(pill("Sand").getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps the cheapest when a dearer variant comes after it", () => {
    // The rows arrive in whatever order the query returned, so "the first one"
    // and "the cheapest one" are different answers whenever the cheap colour is
    // not listed first.
    mount({
      variants: [
        variant({
          id: "var_sand",
          sku: "ssdwwe-12",
          price: { amount: "87.00", currency: "USD" },
          optionValues: [{ id: "val_sand", name: "Sand" }],
        }),
        variant({
          id: "var_onyx",
          sku: "23556-ew",
          price: { amount: "333.00", currency: "USD" },
          optionValues: [{ id: "val_onyx", name: "Onyx" }],
        }),
      ],
    });

    expect(selectedPrice()).toBe("$87.00");
    expect(pill("Sand").getAttribute("aria-pressed")).toBe("true");
  });

  it("still opens on the cheapest when nothing is in stock", () => {
    mount({
      variants: product.variants.map((v) => ({ ...v, stock: 0, inStock: false })),
    });

    expect(selectedPrice()).toBe("$87.00");
  });
});

describe("choosing", () => {
  it("changes the price and the SKU when another colour is picked", () => {
    click(pill("Onyx"));

    expect(selectedPrice()).toBe("$333.00");
    expect(skuLine()).toContain("23556-ew");
    expect(pill("Onyx").getAttribute("aria-pressed")).toBe("true");
    expect(pill("Sand").getAttribute("aria-pressed")).toBe("false");
  });

  it("shows the chosen variant's photograph first", () => {
    click(pill("Onyx"));

    // The gallery leads with what the colour is, without dropping the product's
    // other photographs — a two-colour product would otherwise hide half of
    // them behind whichever colour happened to be selected.
    expect(mainImage()).toBe("/media/media_onyx");
    expect(thumbnails()).toHaveLength(3);

    click(pill("Sand"));
    expect(mainImage()).toBe("/media/media_sand");
  });

  it("shows the photograph whose thumbnail was clicked", () => {
    // The default selection is Sand, so its image leads and the other two
    // follow — the second thumbnail is therefore the first Onyx photograph.
    expect(mainImage()).toBe("/media/media_sand");

    click(thumbnails()[1]!);

    expect(mainImage()).toBe("/media/media_onyx");
    expect(thumbnails()[1]!.getAttribute("aria-pressed")).toBe("true");
  });

  it("renders a pill nothing can be bought in as unavailable", () => {
    // Size M is an option the product offers and no variant stands behind. It
    // is shown — it is part of what the product says it is — and it cannot be
    // chosen, which is the difference a shopper needs to see.
    expect(pill("M")).toHaveProperty("disabled", true);
    expect(pill("Onyx")).toHaveProperty("disabled", false);
  });

  it("leaves the size out of the choice, since no variant carries it", () => {
    // Clicking a disabled pill must not blank the price: the rule matches on
    // the values that select a variant, not on every value on the page.
    click(pill("M"));

    expect(selectedPrice()).toBe("$87.00");
  });
});

describe("the rest of the buy box", () => {
  it("shows the span of what the product can be bought for", () => {
    expect(container.textContent).toContain("$87.00 – $333.00");
  });

  it("shows one figure when every variant costs the same", () => {
    // `priceMax` is null when there is no range to draw, and a lone price drawn
    // as a range reads as a mistake.
    mount({ priceMax: null });

    const prices = [...container.querySelectorAll("p")]
      .map((p) => p.textContent ?? "")
      .filter((text) => text.startsWith("$"));

    expect(prices).not.toHaveLength(0);
    expect(prices.every((text) => !text.includes("–"))).toBe(true);
  });

  it("says review rather than reviews for a single one", () => {
    mount({ rating: { average: 5, count: 1 } });

    expect(container.textContent).toContain("(1 customer review)");
    expect(container.querySelector('[aria-label^="Rated"]')).not.toBeNull();
  });

  it("shows the category and links it to the category's own page", () => {
    // The same address a product's URL is nested under and the breadcrumb
    // points at — not `/shop?category=`, which the shop never read.
    const link = container.querySelector<HTMLAnchorElement>('a[href="/products/earphone"]');

    expect(link?.textContent).toBe("Earphone");
  });

  it("offers a cart button that is disabled, and says why", () => {
    // There is no cart yet, and a button that looks live but does nothing is
    // worse than one that says so.
    const add = buttons().find((button) => button.textContent === "Add to cart");

    expect(add).toHaveProperty("disabled", true);
    expect(container.textContent).toContain("Phase 2");
  });

  it("renders no stars for a product nobody has reviewed", () => {
    expect(container.querySelector('[aria-label^="Rated"]')).toBeNull();
    expect(container.textContent).toContain("(0 customer reviews)");
  });
});

describe("a product with very little", () => {
  it("copes with no options at all", () => {
    mount({
      options: [],
      variants: [variant({ id: "var_only", sku: "ONLY-1" })],
    });

    expect(selectedPrice()).toBe("$10.00");
    expect(skuLine()).toContain("ONLY-1");
  });

  it("copes with no variants at all", () => {
    // Unreachable through the page, which 404s a product with nothing priced —
    // so this is a guard, not a state to design for.
    mount({ options: [], variants: [] });

    expect(container.textContent).toContain("Unavailable");
    expect(skuLine()).not.toContain("SKU");
  });

  it("copes with no images at all", () => {
    mount({ images: [], image: null }, {});

    expect(container.textContent).toContain("Studio Over-Ear");
    expect(container.querySelectorAll("img[src^='/media/']")).toHaveLength(0);
  });
});
