import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestCart } from "./request";

/**
 * The request's cart, with the cookie jar, the clock gate and the repository
 * stood in for — all three are the environment rather than this module.
 */
const jar = vi.hoisted(() => ({ get: vi.fn() }));
const deps = vi.hoisted(() => ({ connection: vi.fn(), getCart: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("next/server", () => ({ connection: deps.connection }));
vi.mock("./cart-repo", () => ({ getCart: deps.getCart }));

beforeEach(() => {
  vi.clearAllMocks();
  deps.getCart.mockResolvedValue({ id: "cart_1" });
});

describe("requestCart", () => {
  it("reads the cart the cookie names", async () => {
    jar.get.mockReturnValue({ name: "cart", value: "tok" });

    expect(await requestCart("de")).toEqual({ id: "cart_1" });
    expect(jar.get).toHaveBeenCalledWith("cart");
    // The clock is read inside `getCart`, so the request must be known to be a
    // request first.
    expect(deps.connection).toHaveBeenCalled();
    expect(deps.getCart).toHaveBeenCalledWith("tok", "de");
  });

  it("has no cart, and asks nothing, without a cookie", async () => {
    jar.get.mockReturnValue(undefined);

    expect(await requestCart("en")).toBeNull();
    expect(deps.connection).not.toHaveBeenCalled();
    expect(deps.getCart).not.toHaveBeenCalled();
  });
});
