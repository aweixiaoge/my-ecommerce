import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyCouponAction, placeOrderAction } from "./actions";

/**
 * "Place Order", with the request stood in for: the cookie jar, Next's refresh
 * and redirect, the currency, and the repository. What is left is what the
 * action decides — which fields it refuses and with what words, and where a
 * placed order goes.
 */
const deps = vi.hoisted(() => ({
  jar: { get: vi.fn() },
  refresh: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
  placeOrder: vi.fn(),
  sessionCustomer: vi.fn(),
  getCart: vi.fn(),
  redeemCoupon: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => deps.jar }));
vi.mock("next/cache", () => ({ refresh: deps.refresh }));
vi.mock("next/navigation", () => ({ redirect: deps.redirect }));
vi.mock("@/lib/currency/request", () => ({
  requestDisplayCurrency: async () => ({ code: "USD", options: [{ code: "USD", rate: "1" }] }),
}));
vi.mock("@/lib/checkout/order-repo", () => ({ placeOrder: deps.placeOrder }));
vi.mock("@/lib/account/account-repo", () => ({ sessionCustomer: deps.sessionCustomer }));
vi.mock("@/lib/cart/cart-repo", () => ({ getCart: deps.getCart }));
vi.mock("@/lib/checkout/coupon-repo", () => ({ redeemCoupon: deps.redeemCoupon }));

const ADDRESS = {
  "shipping.countryCode": "CN",
  "shipping.firstName": "Ada",
  "shipping.lastName": "Lovelace",
  "shipping.line1": "1 Century Avenue",
  "shipping.city": "Shanghai",
  "shipping.region": "Shanghai",
  "shipping.postalCode": "200120",
};

const VALID = {
  locale: "en",
  idempotencyKey: "4b0c5c3e-6a8f-4f45-9d6e-1f2a3b4c5d6e",
  email: "ada@example.com",
  ...ADDRESS,
  billingSameAsShipping: "on",
  shippingMethod: "standard",
  paymentMethod: "cod",
};

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

/** Runs the action, returning its state or the URL it redirected to. */
async function submit(fields: Record<string, string>) {
  try {
    return { state: await placeOrderAction(undefined, form(fields)) };
  } catch (error) {
    return { redirectedTo: (error as { url?: string }).url };
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  deps.jar.get.mockImplementation((name: string) =>
    name === "cart" ? { name, value: "tok" } : undefined,
  );
  deps.sessionCustomer.mockResolvedValue(null);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("placeOrderAction", () => {
  it("places the order and sends the shopper to its confirmation", async () => {
    deps.placeOrder.mockResolvedValue({ status: "placed", orderNumber: 1001, accessKey: "k/1" });

    const result = await submit(VALID);

    expect(result.redirectedTo).toBe("/en/checkout/order-received/1001?key=k%2F1");
    // The header's badge is in a layout the redirect would otherwise reuse.
    expect(deps.refresh).toHaveBeenCalled();
    const [token, input, context] = deps.placeOrder.mock.calls[0]!;
    expect(token).toBe("tok");
    expect(input).toMatchObject({
      email: "ada@example.com",
      billingSameAsShipping: true,
      billing: undefined,
      note: undefined,
      shipping: { countryCode: "CN", region: "Shanghai" },
    });
    expect(context).toMatchObject({ locale: "en", display: { code: "USD" }, customerId: null });
  });

  it("puts the order in the history of the account that is signed in", async () => {
    deps.jar.get.mockImplementation((name: string) =>
      name === "cart" ? { name, value: "tok" } : name === "account_session" ? { name, value: "sess" } : undefined,
    );
    deps.sessionCustomer.mockResolvedValue({ id: "c_1", email: "ada@example.com" });
    deps.placeOrder.mockResolvedValue({ status: "placed", orderNumber: 1001, accessKey: "k" });

    await submit(VALID);

    expect(deps.sessionCustomer).toHaveBeenCalledWith("sess");
    expect(deps.placeOrder.mock.calls[0]![2]).toMatchObject({ customerId: "c_1" });
  });

  it("sends the note only while 'Add a note' is ticked", async () => {
    deps.placeOrder.mockResolvedValue({ status: "placed", orderNumber: 1, accessKey: "k" });

    await submit({ ...VALID, note: "typed, then unticked" });
    await submit({ ...VALID, addNote: "on", note: "Leave at the door" });

    expect(deps.placeOrder.mock.calls[0]![1].note).toBeUndefined();
    expect(deps.placeOrder.mock.calls[1]![1].note).toBe("Leave at the door");
  });

  it("refuses every empty box at once, each under its own name", async () => {
    const { state } = await submit({ locale: "de", idempotencyKey: VALID.idempotencyKey });

    expect(state?.message).toBe("Einige Angaben müssen noch einmal geprüft werden.");
    expect(state?.errors).toMatchObject({
      email: "Gib eine gültige E-Mail-Adresse ein.",
      "shipping.firstName": "Dieses Feld ist erforderlich.",
      "shipping.countryCode": "Wähle ein Land, in das wir liefern.",
      "billing.firstName": "Dieses Feld ist erforderlich.",
      paymentMethod: "Wähle eine Zahlungsart.",
    });
    expect(deps.placeOrder).not.toHaveBeenCalled();
  });

  it("reports a missing province with the rest, not a round trip later", async () => {
    const { state } = await submit({ ...VALID, "shipping.region": "", email: "" });

    expect(state?.errors).toMatchObject({
      email: "Enter a valid email address.",
      "shipping.region": "Choose one from the list.",
    });
  });

  it("checks the billing address too when it is a different one", async () => {
    const billing = Object.fromEntries(
      Object.entries(ADDRESS).map(([key, value]) => [key.replace("shipping", "billing"), value]),
    );
    const { state } = await submit({
      ...VALID,
      billingSameAsShipping: "",
      ...billing,
      "billing.countryCode": "BR",
    });

    expect(state?.errors).toEqual({ "billing.countryCode": "Choose a country we ship to." });
  });

  it("says a box is too long rather than empty", async () => {
    const { state } = await submit({ ...VALID, "shipping.city": "x".repeat(101) });

    expect(state?.errors).toEqual({ "shipping.city": "This is too long." });
  });

  it("treats a form with no key as a stale page", async () => {
    const { state } = await submit({ ...VALID, idempotencyKey: "" });

    expect(state).toEqual({ message: "Your order could not be placed. Please try again." });
  });

  it.each([
    ["empty", { message: "Your cart is empty — there is nothing to order." }],
    [
      "stockChanged",
      {
        message:
          "Some items sold out while you were checking out. Review your cart and try again.",
        reviewCart: true,
      },
    ],
  ])("explains a cart that came back %s", async (status, expected) => {
    deps.placeOrder.mockResolvedValue({ status });

    expect((await submit(VALID)).state).toEqual(expected);
  });

  it("says it failed, rather than throwing, when the database does", async () => {
    deps.placeOrder.mockRejectedValue(new Error("connection refused"));

    expect((await submit({ ...VALID, locale: "xx" })).state).toEqual({
      message: "Your order could not be placed. Please try again.",
    });
  });
});

describe("placeOrderAction's coupon", () => {
  it("passes the applied code on, and none for a blank one", async () => {
    deps.placeOrder.mockResolvedValue({ status: "placed", orderNumber: 1, accessKey: "k" });

    await submit({ ...VALID, couponCode: "save10" });
    await submit({ ...VALID, couponCode: "  " });

    expect(deps.placeOrder.mock.calls[0]![1].couponCode).toBe("SAVE10");
    expect(deps.placeOrder.mock.calls[1]![1].couponCode).toBeUndefined();
  });

  it("says why a coupon was refused at placing, and has the form drop it", async () => {
    deps.placeOrder.mockResolvedValue({ status: "couponRefused", reason: "expired" });

    const { state } = await submit({ ...VALID, locale: "fr", couponCode: "SAVE10" });

    expect(state).toEqual({
      message:
        "Votre code promo ne peut plus être utilisé et a été retiré. Vérifiez le nouveau total et passez à nouveau votre commande.",
      errors: { couponCode: "Ce code promo a expiré." },
      couponRefused: true,
    });
    expect(deps.redirect).not.toHaveBeenCalled();
  });
});

describe("applyCouponAction", () => {
  const buyable = { id: "item_1", unavailableReason: null };
  const withdrawn = { id: "item_2", unavailableReason: "withdrawn" };

  beforeEach(() => {
    deps.getCart.mockResolvedValue({ items: [buyable, withdrawn] });
  });

  it("previews the discount on the cart's buyable lines, by the normalised code", async () => {
    const applied = { status: "applied", code: "SAVE10", discount: { amount: "2.12", currency: "USD" } };
    deps.redeemCoupon.mockResolvedValue(applied);

    expect(await applyCouponAction("en", " save10 ")).toEqual(applied);
    expect(deps.getCart).toHaveBeenCalledWith("tok", "en");
    expect(deps.redeemCoupon).toHaveBeenCalledWith("SAVE10", [buyable]);
  });

  it("passes a refusal through as its status", async () => {
    deps.redeemCoupon.mockResolvedValue({ status: "notApplicable" });

    expect(await applyCouponAction("en", "SAVE10")).toEqual({ status: "notApplicable" });
  });

  it("treats a blank or overlong code as one no coupon has, without a query", async () => {
    expect(await applyCouponAction("en", "   ")).toEqual({ status: "unknown" });
    expect(await applyCouponAction("en", "X".repeat(33))).toEqual({ status: "unknown" });
    expect(deps.redeemCoupon).not.toHaveBeenCalled();
  });

  it("has nothing to discount without a buyable line", async () => {
    deps.getCart.mockResolvedValue({ items: [withdrawn] });
    expect(await applyCouponAction("en", "SAVE10")).toEqual({ status: "empty" });

    deps.jar.get.mockReturnValue(undefined);
    expect(await applyCouponAction("en", "SAVE10")).toEqual({ status: "empty" });
    expect(deps.redeemCoupon).not.toHaveBeenCalled();
  });

  it("says it failed, rather than throwing, when the database does", async () => {
    deps.redeemCoupon.mockRejectedValue(new Error("down"));

    expect(await applyCouponAction("en", "SAVE10")).toEqual({ status: "failed" });
  });
});
