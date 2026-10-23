import { beforeEach, describe, expect, it, vi } from "vitest";
import { addToCartAction, updateCartLineAction } from "./actions";

/**
 * The cart's actions, with the request stood in for: the cookie jar, Next's
 * refresh, and the repository. What is left is what the actions decide — what
 * a form is allowed to ask for, when the cookie is set, and what is reported.
 */
const jar = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
const deps = vi.hoisted(() => ({
  refresh: vi.fn(),
  addToCart: vi.fn(),
  updateCartLine: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("next/cache", () => ({ refresh: deps.refresh }));
vi.mock("@/lib/cart/cart-repo", () => ({
  addToCart: deps.addToCart,
  updateCartLine: deps.updateCartLine,
}));

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
  jar.get.mockReturnValue({ name: "cart", value: "tok" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("addToCartAction", () => {
  it("adds one of the variant, sets the cookie, and refreshes the page", async () => {
    deps.addToCart.mockResolvedValue({ status: "added", token: "tok2", quantity: 1 });

    const state = await addToCartAction(undefined, form({ variantId: "var_1" }));

    expect(state).toEqual({ status: "added", quantity: 1 });
    expect(deps.addToCart).toHaveBeenCalledWith("tok", { variantId: "var_1", quantity: 1 });
    expect(jar.set).toHaveBeenCalledWith(
      "cart",
      "tok2",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
    expect(deps.refresh).toHaveBeenCalled();
  });

  it("reports a limited add with the line's total", async () => {
    deps.addToCart.mockResolvedValue({ status: "limited", token: "tok", quantity: 3 });

    expect(await addToCartAction(undefined, form({ productId: "prod_1" }))).toEqual({
      status: "limited",
      quantity: 3,
    });
  });

  it("sets no cookie when nothing was added", async () => {
    deps.addToCart.mockResolvedValue({ status: "outOfStock" });

    expect(await addToCartAction(undefined, form({ variantId: "var_1" }))).toEqual({
      status: "outOfStock",
    });
    expect(jar.set).not.toHaveBeenCalled();
    expect(deps.refresh).not.toHaveBeenCalled();
  });

  it("refuses a form that names no item, or both kinds", async () => {
    expect(await addToCartAction(undefined, form({}))).toEqual({ status: "unavailable" });
    expect(
      await addToCartAction(undefined, form({ variantId: "v", productId: "p" })),
    ).toEqual({ status: "unavailable" });
    expect(deps.addToCart).not.toHaveBeenCalled();
  });

  it("says it failed, rather than throwing, when the database does", async () => {
    deps.addToCart.mockRejectedValue(new Error("connection refused"));

    expect(await addToCartAction(undefined, form({ variantId: "var_1" }))).toEqual({
      status: "failed",
    });
  });
});

describe("updateCartLineAction", () => {
  it("changes the line and refreshes the page", async () => {
    deps.updateCartLine.mockResolvedValue("updated");

    await updateCartLineAction(form({ itemId: "item_1", quantity: "3" }));

    expect(deps.updateCartLine).toHaveBeenCalledWith("tok", { itemId: "item_1", quantity: 3 });
    expect(deps.refresh).toHaveBeenCalled();
  });

  it("ignores a form it cannot read", async () => {
    await updateCartLineAction(form({ itemId: "item_1", quantity: "-4" }));

    expect(deps.updateCartLine).not.toHaveBeenCalled();
  });

  it("still re-renders the page when the write fails", async () => {
    deps.updateCartLine.mockRejectedValue(new Error("connection refused"));

    await updateCartLineAction(form({ itemId: "item_1", quantity: "0" }));

    expect(deps.refresh).toHaveBeenCalled();
  });
});
