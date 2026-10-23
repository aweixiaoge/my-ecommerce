import { prisma, type Prisma } from "@my-ecommerce/db";
import {
  CART_LINE_QUANTITY_MAX,
  type Cart,
  type CartAdd,
  type CartLineUpdate,
} from "@my-ecommerce/shared";
import { defaultVariant, priceOf } from "@/lib/catalog/pricing";
import { SHOP_CURRENCY } from "@/lib/currency/display";
import type { Locale } from "@/lib/languages";
import { cartSelect, toCart } from "./cart-rows";
import { CART_TTL_MS, hashCartToken, newCartToken } from "./cart-token";

/**
 * Reading and writing guest carts.
 *
 * Every function takes the raw token from the shopper's cookie and hashes it
 * here — callers never see a hash, and nothing below ever stores a raw token.
 * A token that names no cart, or an expired one, is the same as no token: an
 * old cookie is not an error, it is a shopper with an empty cart.
 *
 * `now` is a parameter so expiry is testable without fake timers, the way
 * `lib/admin/session-store.ts` does it.
 */

/** The shopper's cart, or null when they have none worth showing. */
export async function getCart(
  token: string | undefined,
  locale: Locale,
  now?: Date,
): Promise<Cart | null> {
  if (!token) return null;

  const row = await prisma.cart.findFirst({
    where: {
      tokenHash: hashCartToken(token),
      // The clock is read only once there is a cart to ask about, never as a
      // default parameter: with Cache Components, reading the time during a
      // prerender is an error. `lib/cart/request.ts` is what makes it safe.
      expiresAt: { gt: now ?? new Date() },
    },
    select: cartSelect(locale),
  });

  return row ? toCart(row, locale) : null;
}

/**
 * What an add did.
 *
 * `token` comes back whenever a cart was written, new or not, so the caller can
 * set the cookie again and slide its expiry along with the row's.
 *
 * - `added`: all of it went in. `quantity` is the line's new total.
 * - `limited`: some went in, but the line is now at the most it can hold —
 *   everything in stock, or `CART_LINE_QUANTITY_MAX`.
 * - `outOfStock`: none left, so nothing was written and no cart was made.
 * - `unavailable`: not something the shop is selling — no such variant, a
 *   product that is not active, or one with no price. Nothing was written.
 */
export type AddToCartResult =
  | { status: "added" | "limited"; token: string; quantity: number }
  | { status: "outOfStock" | "unavailable" };

export async function addToCart(
  token: string | undefined,
  input: CartAdd,
  now = new Date(),
): Promise<AddToCartResult> {
  // The variant first, so a refused add never mints a cart nobody can use.
  const variant = await purchasableVariant(input);
  if (!variant) return { status: "unavailable" };

  const size = await chosenSize(variant.productId, input.optionValueId);
  if (size === undefined) return { status: "unavailable" };

  if (variant.stock <= 0) return { status: "outOfStock" };

  return prisma.$transaction(async (tx) => {
    const cart = await openCart(tx, token, now);

    // A lookup rather than an upsert on the unique index: the index cannot
    // match a null size (see `CartItem` in the schema), and a size-less line is
    // the common case.
    const existing = await tx.cartItem.findFirst({
      where: { cartId: cart.id, variantId: variant.id, optionValueId: size },
      select: { id: true, quantity: true },
    });

    const wanted = (existing?.quantity ?? 0) + input.quantity;
    const quantity = Math.min(wanted, variant.stock, CART_LINE_QUANTITY_MAX);

    if (existing) {
      await tx.cartItem.update({ where: { id: existing.id }, data: { quantity } });
    } else {
      await tx.cartItem.create({
        data: { cartId: cart.id, variantId: variant.id, optionValueId: size, quantity },
      });
    }

    return {
      status: quantity < wanted ? "limited" : "added",
      token: cart.token,
      quantity,
    };
  });
}

/**
 * What a change on the cart page did.
 *
 * - `updated` / `removed`: what it says.
 * - `limited`: the line was set as high as stock allows, which is less than
 *   asked — or, for a line with nothing left, left as it was.
 * - `missing`: no such line in *this* shopper's cart. The id is checked against
 *   the cart the cookie opens, so a line id from someone else's cart is the
 *   same answer as one that does not exist.
 */
export type CartLineResult = "updated" | "removed" | "limited" | "missing";

export async function updateCartLine(
  token: string | undefined,
  input: CartLineUpdate,
  now = new Date(),
): Promise<CartLineResult> {
  if (!token) return "missing";

  const item = await prisma.cartItem.findFirst({
    where: {
      id: input.itemId,
      cart: { tokenHash: hashCartToken(token), expiresAt: { gt: now } },
    },
    select: { id: true, quantity: true, variant: { select: { stock: true } } },
  });
  if (!item) return "missing";

  if (input.quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return "removed";
  }

  const quantity = Math.min(input.quantity, item.variant.stock);
  // Stock gone entirely: a line cannot be raised to zero, and lowering it to
  // zero is "Remove", which says so. Leave it for the shopper to decide.
  if (quantity < 1) return "limited";

  if (quantity !== item.quantity) {
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  }

  return quantity < input.quantity ? "limited" : "updated";
}

/**
 * The variant an add is about, if the shop is selling it: its id and its stock.
 *
 * The filter is the storefront's rule for "for sale" — an active product, and
 * a variant with a SKU and a price in the shop's currency. A product id resolves
 * to `defaultVariant` of the ones that pass, ordered by id so a tie in price
 * resolves the same way the product page's does (`productDetailSelect` orders
 * its variants by id too).
 */
async function purchasableVariant(
  input: CartAdd,
): Promise<{ id: string; stock: number; productId: string } | null> {
  const forSale = {
    sku: { not: null },
    priceAmount: { not: null },
    priceCurrency: SHOP_CURRENCY,
    product: { status: "active" },
  } satisfies Prisma.ProductVariantWhereInput;

  if (input.variantId !== undefined) {
    return prisma.productVariant.findFirst({
      where: { id: input.variantId, ...forSale },
      select: { id: true, stock: true, productId: true },
    });
  }

  const rows = await prisma.productVariant.findMany({
    where: { productId: input.productId, ...forSale },
    orderBy: { id: "asc" },
    select: {
      id: true,
      stock: true,
      productId: true,
      priceAmount: true,
      priceCurrency: true,
    },
  });

  const chosen = defaultVariant(
    rows.flatMap((row) =>
      priceOf(row).map((price) => ({ ...row, price, inStock: row.stock > 0 })),
    ),
  );

  return chosen
    ? { id: chosen.id, stock: chosen.stock, productId: chosen.productId }
    : null;
}

/**
 * The size a line is for: `null` for a product with no sizes, the value asked
 * for when it is one of this product's, the first size when none was asked
 * for — and `undefined` when the value named is not a size of this product.
 *
 * "Size" here is any option no variant stands behind (`CartItem` in the
 * schema says why there is one). The admin's form writes at most one such
 * option, so the first in position order is the one.
 *
 * Falling back to the first size is the product page's rule, not a guess: the
 * page opens with it chosen, so a card's add puts in the cart what the card's
 * product page would have shown.
 */
async function chosenSize(
  productId: string,
  requested: string | undefined,
): Promise<string | null | undefined> {
  const sizes = await prisma.productOptionValue.findMany({
    where: {
      option: { productId, values: { every: { variants: { none: {} } } } },
    },
    orderBy: [{ option: { position: "asc" } }, { position: "asc" }],
    select: { id: true },
  });

  if (requested === undefined) return sizes.at(0)?.id ?? null;

  return sizes.some((size) => size.id === requested) ? requested : undefined;
}

/**
 * The cart a token opens, its expiry slid forward — or a new one.
 *
 * An expired cart is deleted and replaced rather than revived. Its lines were
 * chosen more than `CART_TTL_MS` ago, and a shopper who comes back after a
 * month to add one thing should not find a cart of things they forgot.
 */
async function openCart(
  tx: Pick<Prisma.TransactionClient, "cart">,
  token: string | undefined,
  now: Date,
): Promise<{ id: string; token: string }> {
  const expiresAt = new Date(now.getTime() + CART_TTL_MS);

  if (token) {
    const tokenHash = hashCartToken(token);
    const existing = await tx.cart.findUnique({
      where: { tokenHash },
      select: { id: true, expiresAt: true },
    });

    if (existing && existing.expiresAt > now) {
      await tx.cart.update({ where: { id: existing.id }, data: { expiresAt } });
      return { id: existing.id, token };
    }

    if (existing) await tx.cart.delete({ where: { id: existing.id } });
  }

  const fresh = newCartToken();
  const created = await tx.cart.create({
    data: { tokenHash: hashCartToken(fresh), expiresAt },
    select: { id: true },
  });

  return { id: created.id, token: fresh };
}
