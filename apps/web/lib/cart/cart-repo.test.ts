import { beforeEach, describe, expect, it, vi } from "vitest";
import { addToCart, getCart, updateCartLine } from "./cart-repo";
import { CART_TTL_MS, hashCartToken } from "./cart-token";

/**
 * The cart's reads and writes, against a stand-in for the database.
 *
 * The lane has no Postgres (`.claude/tdd-guardian/config.json`), so what is
 * asserted is what each write decides — how many go in, whether a cart is
 * made, which cart a token may touch — and the shape of the filters that keep
 * a shopper out of anybody else's cart.
 */
const db = vi.hoisted(() => {
  const tx = {
    cart: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
    cartItem: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  };

  return {
    tx,
    cart: { findFirst: vi.fn() },
    cartItem: { findFirst: vi.fn(), delete: vi.fn(), update: vi.fn() },
    productVariant: { findFirst: vi.fn(), findMany: vi.fn() },
    productOptionValue: { findMany: vi.fn() },
    $transaction: vi.fn(async (run: (client: typeof tx) => unknown) => run(tx)),
  };
});

vi.mock("@my-ecommerce/db", () => ({ prisma: db }));

const NOW = new Date("2026-10-21T12:00:00.000Z");
const LATER = new Date(NOW.getTime() + CART_TTL_MS);

beforeEach(() => {
  vi.clearAllMocks();
  db.productVariant.findFirst.mockResolvedValue({ id: "var_1", stock: 10, productId: "prod_1" });
  db.productVariant.findMany.mockResolvedValue([]);
  // No sizes: most of the catalogue.
  db.productOptionValue.findMany.mockResolvedValue([]);
  db.tx.cart.findUnique.mockResolvedValue(null);
  db.tx.cart.create.mockResolvedValue({ id: "cart_new" });
  db.tx.cartItem.findFirst.mockResolvedValue(null);
});

describe("getCart", () => {
  it("has no cart for a shopper with no cookie, and asks nothing", async () => {
    expect(await getCart(undefined, "en")).toBeNull();
    expect(db.cart.findFirst).not.toHaveBeenCalled();
  });

  it("looks the cart up by the token's hash, and only while it is live", async () => {
    db.cart.findFirst.mockResolvedValue(null);

    expect(await getCart("tok", "en", NOW)).toBeNull();
    expect(db.cart.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tokenHash: hashCartToken("tok"), expiresAt: { gt: NOW } },
      }),
    );
  });

  it("maps the row it finds", async () => {
    db.cart.findFirst.mockResolvedValue({ id: "cart_1", items: [] });

    expect(await getCart("tok", "en")).toMatchObject({ id: "cart_1", itemCount: 0 });
  });
});

describe("addToCart", () => {
  it("makes a cart for a shopper with none, and puts the line in it", async () => {
    const result = await addToCart(undefined, { variantId: "var_1", quantity: 2 }, NOW);

    expect(result).toMatchObject({ status: "added", quantity: 2 });
    const token = (result as { token: string }).token;
    expect(db.tx.cart.create).toHaveBeenCalledWith({
      data: { tokenHash: hashCartToken(token), expiresAt: LATER },
      select: { id: true },
    });
    expect(db.tx.cartItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cartId: "cart_new", variantId: "var_1", optionValueId: null },
      }),
    );
    expect(db.tx.cartItem.create).toHaveBeenCalledWith({
      data: { cartId: "cart_new", variantId: "var_1", optionValueId: null, quantity: 2 },
    });
  });

  it("raises the line already holding this variant, rather than drawing it twice", async () => {
    db.tx.cart.findUnique.mockResolvedValue({ id: "cart_1", expiresAt: LATER });
    db.tx.cartItem.findFirst.mockResolvedValue({ id: "item_1", quantity: 3 });

    await addToCart("tok", { variantId: "var_1", quantity: 2 }, NOW);

    expect(db.tx.cartItem.update).toHaveBeenCalledWith({
      where: { id: "item_1" },
      data: { quantity: 5 },
    });
    expect(db.tx.cartItem.create).not.toHaveBeenCalled();
  });

  describe("with sizes", () => {
    beforeEach(() => {
      db.productOptionValue.findMany.mockResolvedValue([{ id: "val_s" }, { id: "val_m" }]);
    });

    it("records the size that was picked, and keeps it apart from other sizes", async () => {
      await addToCart(undefined, { variantId: "var_1", optionValueId: "val_m", quantity: 1 });

      // Sizes are the values of an option no variant stands behind.
      expect(db.productOptionValue.findMany).toHaveBeenCalledWith({
        where: {
          option: { productId: "prod_1", values: { every: { variants: { none: {} } } } },
        },
        orderBy: [{ option: { position: "asc" } }, { position: "asc" }],
        select: { id: true },
      });
      expect(db.tx.cartItem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ optionValueId: "val_m" }),
        }),
      );
      expect(db.tx.cartItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ optionValueId: "val_m" }),
      });
    });

    it("takes the first size when none was picked, as the product page opens", async () => {
      await addToCart(undefined, { variantId: "var_1", quantity: 1 });

      expect(db.tx.cartItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ optionValueId: "val_s" }),
      });
    });

    it("refuses a size that is not one of this product's", async () => {
      expect(
        await addToCart(undefined, { variantId: "var_1", optionValueId: "val_other", quantity: 1 }),
      ).toEqual({ status: "unavailable" });
      expect(db.$transaction).not.toHaveBeenCalled();
    });
  });

  it("adds to a live cart, sliding its expiry and keeping its token", async () => {
    db.tx.cart.findUnique.mockResolvedValue({ id: "cart_1", expiresAt: LATER });
    db.tx.cartItem.findFirst.mockResolvedValue({ id: "item_1", quantity: 3 });

    const result = await addToCart("tok", { variantId: "var_1", quantity: 1 }, NOW);

    expect(result).toEqual({ status: "added", token: "tok", quantity: 4 });
    expect(db.tx.cart.update).toHaveBeenCalledWith({
      where: { id: "cart_1" },
      data: { expiresAt: LATER },
    });
    expect(db.tx.cart.create).not.toHaveBeenCalled();
  });

  it("replaces an expired cart rather than reviving what was in it", async () => {
    db.tx.cart.findUnique.mockResolvedValue({ id: "cart_old", expiresAt: NOW });

    const result = await addToCart("tok", { variantId: "var_1", quantity: 1 }, NOW);

    expect(db.tx.cart.delete).toHaveBeenCalledWith({ where: { id: "cart_old" } });
    expect(db.tx.cart.create).toHaveBeenCalled();
    expect((result as { token: string }).token).not.toBe("tok");
  });

  it("mints a new cart for a token that names none", async () => {
    const result = await addToCart("stale", { variantId: "var_1", quantity: 1 }, NOW);

    expect(db.tx.cart.delete).not.toHaveBeenCalled();
    expect((result as { token: string }).token).not.toBe("stale");
  });

  it("stops at what is in stock, and says so", async () => {
    db.productVariant.findFirst.mockResolvedValue({ id: "var_1", stock: 3, productId: "prod_1" });
    db.tx.cartItem.findFirst.mockResolvedValue({ id: "item_1", quantity: 2 });

    const result = await addToCart(undefined, { variantId: "var_1", quantity: 5 });

    expect(result).toMatchObject({ status: "limited", quantity: 3 });
  });

  it("stops at the line's bound however much is in stock", async () => {
    db.productVariant.findFirst.mockResolvedValue({ id: "var_1", stock: 5000, productId: "prod_1" });
    db.tx.cartItem.findFirst.mockResolvedValue({ id: "item_1", quantity: 98 });

    const result = await addToCart(undefined, { variantId: "var_1", quantity: 5 });

    expect(result).toMatchObject({ status: "limited", quantity: 99 });
  });

  it("refuses a variant the shop is not selling, and makes no cart", async () => {
    db.productVariant.findFirst.mockResolvedValue(null);

    expect(await addToCart(undefined, { variantId: "var_x", quantity: 1 })).toEqual({
      status: "unavailable",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
    // "For sale" is the storefront's rule, applied in the query.
    expect(db.productVariant.findFirst).toHaveBeenCalledWith({
      where: {
        id: "var_x",
        sku: { not: null },
        priceAmount: { not: null },
        priceCurrency: "USD",
        product: { status: "active" },
      },
      select: { id: true, stock: true, productId: true },
    });
  });

  it("refuses a sold-out variant, and makes no cart", async () => {
    db.productVariant.findFirst.mockResolvedValue({ id: "var_1", stock: 0, productId: "prod_1" });

    expect(await addToCart(undefined, { variantId: "var_1", quantity: 1 })).toEqual({
      status: "outOfStock",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  describe("by product, as a shop card adds", () => {
    const row = (id: string, amount: string, stock: number) => ({
      id,
      stock,
      productId: "prod_1",
      priceAmount: { toString: () => amount },
      priceCurrency: "USD",
    });

    it("adds the cheapest variant in stock — the one the card's price is for", async () => {
      db.productVariant.findMany.mockResolvedValue([
        row("var_cheap_gone", "5.00", 0),
        row("var_dear", "56.00", 4),
        row("var_cheap", "23.00", 9),
      ]);

      await addToCart(undefined, { productId: "prod_1", quantity: 1 });

      expect(db.productVariant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ productId: "prod_1" }),
          orderBy: { id: "asc" },
        }),
      );
      expect(db.tx.cartItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ variantId: "var_cheap" }),
      });
    });

    it("says sold out when no variant has stock", async () => {
      db.productVariant.findMany.mockResolvedValue([row("var_1", "5.00", 0)]);

      expect(await addToCart(undefined, { productId: "prod_1", quantity: 1 })).toEqual({
        status: "outOfStock",
      });
    });

    it("is unavailable when nothing about the product is for sale", async () => {
      expect(await addToCart(undefined, { productId: "prod_1", quantity: 1 })).toEqual({
        status: "unavailable",
      });
    });
  });
});

describe("updateCartLine", () => {
  const line = (quantity: number, stock: number) => ({
    id: "item_1",
    quantity,
    variant: { stock },
  });

  it("only touches a line in the cart this token opens", async () => {
    db.cartItem.findFirst.mockResolvedValue(null);

    expect(await updateCartLine("tok", { itemId: "item_other", quantity: 2 }, NOW)).toBe(
      "missing",
    );
    expect(db.cartItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "item_other",
          cart: { tokenHash: hashCartToken("tok"), expiresAt: { gt: NOW } },
        },
      }),
    );
    expect(db.cartItem.update).not.toHaveBeenCalled();
  });

  it("has nothing to change without a cookie", async () => {
    expect(await updateCartLine(undefined, { itemId: "item_1", quantity: 2 })).toBe("missing");
    expect(db.cartItem.findFirst).not.toHaveBeenCalled();
  });

  it("sets the quantity asked for", async () => {
    db.cartItem.findFirst.mockResolvedValue(line(1, 10));

    expect(await updateCartLine("tok", { itemId: "item_1", quantity: 2 })).toBe("updated");
    expect(db.cartItem.update).toHaveBeenCalledWith({
      where: { id: "item_1" },
      data: { quantity: 2 },
    });
  });

  it("removes the line at zero", async () => {
    db.cartItem.findFirst.mockResolvedValue(line(1, 10));

    expect(await updateCartLine("tok", { itemId: "item_1", quantity: 0 })).toBe("removed");
    expect(db.cartItem.delete).toHaveBeenCalledWith({ where: { id: "item_1" } });
  });

  it("holds a line to what is in stock", async () => {
    db.cartItem.findFirst.mockResolvedValue(line(5, 3));

    expect(await updateCartLine("tok", { itemId: "item_1", quantity: 4 })).toBe("limited");
    expect(db.cartItem.update).toHaveBeenCalledWith({
      where: { id: "item_1" },
      data: { quantity: 3 },
    });
  });

  it("writes nothing when the line is already as high as stock allows", async () => {
    db.cartItem.findFirst.mockResolvedValue(line(3, 3));

    expect(await updateCartLine("tok", { itemId: "item_1", quantity: 4 })).toBe("limited");
    expect(db.cartItem.update).not.toHaveBeenCalled();
  });

  it("leaves a sold-out line for the shopper to remove", async () => {
    db.cartItem.findFirst.mockResolvedValue(line(2, 0));

    expect(await updateCartLine("tok", { itemId: "item_1", quantity: 1 })).toBe("limited");
    expect(db.cartItem.update).not.toHaveBeenCalled();
    expect(db.cartItem.delete).not.toHaveBeenCalled();
  });
});
