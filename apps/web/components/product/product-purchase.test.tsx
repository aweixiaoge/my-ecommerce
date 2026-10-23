import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Media, Product, Variant } from "@my-ecommerce/shared";
import { displayCurrency, type DisplayCurrency } from "@/lib/currency/display";
import { en } from "@/lib/i18n/messages/en";
import { ProductPurchase } from "./product-purchase";

/*
 * The picker, driven the way a shopper drives it.
 *
 * A real DOM rather than rendered markup, because the point of this component
 * is what happens *after* a click — and plain DOM queries rather than a testing
 * library, which this project does not have and does not need for finding a
 * button by its label.
 */

// The button posts to a Server Action, which reaches the database. What the
// buy box decides is *which variant* the form names, so that is what the
// tests below read; `add-to-cart-button.test.tsx` covers the round trip.
vi.mock("@/app/[lang]/cart/actions", () => ({ addToCartAction: vi.fn() }));

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

/** The shop's own currency, and the one a reader who chose euros gets: 87.00
 *  dollars is 80.04 euros and 333.00 is 306.36 at the seeded rate. */
const USD = displayCurrency([]);
const EUR = displayCurrency([{ base: "USD", quote: "EUR", rate: "0.92" }], "EUR");

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
  currency: DisplayCurrency = USD,
) {
  if (root) act(() => root.unmount());
  container?.remove();

  container = document.createElement("div");
  document.body.append(container);

  act(() => {
    root = createRoot(container);
    root.render(
      <ProductPurchase
        product={{ ...product, ...over }}
        imagesByVariant={images}
        messages={en.product}
        ratingMessages={en.reviews}
        cartMessages={en.cart.add}
        locale="en"
        currency={currency}
      />,
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

/** The variant the cart form would post. */
const chosenVariant = () =>
  container.querySelector<HTMLInputElement>('input[name="variantId"]')?.value;

/** …and the size beside it, when there is one. */
const chosenSize = () =>
  container.querySelector<HTMLInputElement>('input[name="optionValueId"]')?.value;

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
 * starting with a currency symbol, and only one of them moves when a pill is
 * clicked. The symbol is an argument because the same price is written `$87.00`
 * or `€80.04` depending on what the reader chose.
 */
const selectedPrice = (symbol = "$") =>
  [...container.querySelectorAll("p")]
    .map((p) => p.textContent ?? "")
    .find((text) => text.startsWith(symbol) && !text.includes("–"));

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

  it("lets a size be chosen, though no variant stands behind it", () => {
    // Size is an option no variant carries — the admin writes one variant per
    // colour — so it is a choice the cart records beside the variant, and its
    // pills are live.
    expect(pill("M")).toHaveProperty("disabled", false);
    expect(pill("Onyx")).toHaveProperty("disabled", false);
  });

  it("opens on the first size, and sends it with the variant", () => {
    expect(pill("M").getAttribute("aria-pressed")).toBe("true");
    expect(chosenSize()).toBe("val_m");
    expect(chosenVariant()).toBe("var_sand");
  });

  it("sends the size that was picked", () => {
    mount({
      options: [
        product.options[0]!,
        {
          ...product.options[1]!,
          values: [
            { id: "val_m", name: "M" },
            { id: "val_l", name: "L" },
          ],
        },
      ],
    });

    click(pill("L"));

    expect(pill("L").getAttribute("aria-pressed")).toBe("true");
    expect(chosenSize()).toBe("val_l");
    // The size picks no variant, so the price stays the colour's.
    expect(selectedPrice()).toBe("$87.00");
  });

  it("sends no size for a product without one", () => {
    mount({ options: [product.options[0]!] });

    expect(chosenSize()).toBeUndefined();
  });

  it("still disables a colour no variant carries", () => {
    // A gap in a variant-selecting option is not a choice: picking it would
    // name no variant. Only a wholly free option is live.
    mount({
      options: [
        {
          ...product.options[0]!,
          values: [...product.options[0]!.values, { id: "val_clay", name: "Clay" }],
        },
        product.options[1]!,
      ],
    });

    expect(pill("Clay")).toHaveProperty("disabled", true);
    expect(pill("M")).toHaveProperty("disabled", false);
  });
});

describe("the counter", () => {
  const quantity = () =>
    container.querySelector<HTMLInputElement>('input[name="quantity"]')!;
  const stepper = (label: string) =>
    container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

  it("starts at one and steps within the variant's stock", () => {
    // Sand has 5 in stock in the fixture.
    expect(quantity().value).toBe("1");
    expect(stepper("One fewer").disabled).toBe(true);

    for (let i = 0; i < 6; i++) click(stepper("One more"));

    expect(quantity().value).toBe("5");
    expect(stepper("One more").disabled).toBe(true);

    click(stepper("One fewer"));
    expect(quantity().value).toBe("4");
  });

  it("starts over when another colour is picked", () => {
    click(stepper("One more"));
    click(pill("Onyx"));

    expect(quantity().value).toBe("1");
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
    const link = container.querySelector<HTMLAnchorElement>('a[href="/en/products/earphone"]');

    expect(link?.textContent).toBe("Earphone");
  });

  it("adds the variant the shopper is looking at", () => {
    const add = buttons().find((button) => button.textContent === "Add to cart");

    expect(add).toHaveProperty("disabled", false);
    expect(chosenVariant()).toBe("var_sand");
  });

  it("adds the other colour once it is picked", () => {
    click(pill("Onyx"));

    expect(chosenVariant()).toBe("var_onyx");
  });

  it("says sold out, and adds nothing, for a variant with no stock", () => {
    mount({
      variants: product.variants.map((v) => ({ ...v, stock: 0, inStock: false })),
    });

    const add = buttons().find((button) => button.textContent === "Sold out");
    expect(add).toHaveProperty("disabled", true);
  });

  it("adds nothing when no variant stands behind the selection", () => {
    mount({ variants: [] });

    const add = buttons().find((button) => button.textContent === "Add to cart");
    expect(add).toHaveProperty("disabled", true);
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

describe("a product video", () => {
  const clip: Media = { ...media("media_clip", 1), kind: "video" };

  it("shows a video thumbnail as its first frame, not as a picture", () => {
    mount({}, { ...imagesByVariant, var_sand: [media("media_sand"), clip] });

    expect(container.querySelector("button video")?.getAttribute("src")).toBe("/media/media_clip#t=0.1");
  });

  it("plays the video in the main frame once its thumbnail is chosen", () => {
    mount({}, { ...imagesByVariant, var_sand: [media("media_sand"), clip] });

    click(thumbnails()[1]!);

    const player = container.querySelector<HTMLVideoElement>("video[controls]");
    expect(player?.getAttribute("src")).toBe("/media/media_clip");
    // Muted, so the browser lets it start without a click.
    expect(player?.muted).toBe(true);
  });

  it("opens on the video when the admin put it first", () => {
    mount({}, { ...imagesByVariant, var_sand: [{ ...clip, position: 0 }, media("media_sand", 1)] });

    expect(container.querySelector("video[controls]")?.getAttribute("src")).toBe("/media/media_clip");
  });
});

describe("the reader's currency", () => {
  it("writes the span and the chosen variant's price in it, together", () => {
    mount({}, imagesByVariant, EUR);

    expect(container.textContent).toContain("€80.04 – €306.36");
    expect(selectedPrice("€")).toBe("€80.04");
  });

  it("converts the price the pills decide, not only the one on arrival", () => {
    // The reason the table crosses to this side of the boundary rather than the
    // server handing over converted figures: which variant's price is on screen
    // is not known until somebody clicks, and the click is not a round trip.
    mount({}, imagesByVariant, EUR);

    click(pill("Onyx"));

    expect(selectedPrice("€")).toBe("€306.36");
  });

  it("leaves the price alone for a reader who has chosen nothing", () => {
    mount();

    expect(selectedPrice()).toBe("$87.00");
  });
});
