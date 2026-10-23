import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginAction, logoutAction, registerAction, saveAddressAction } from "./actions";

/**
 * The My account actions, with the request stood in for: the cookie jar,
 * Next's refresh and redirect, and the repository. What is left is what the
 * actions decide — which sentences a refusal gets, what cookie a sign-in
 * sets, and where everyone is sent.
 */
const deps = vi.hoisted(() => ({
  jar: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
  refresh: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
  authenticateCustomer: vi.fn(),
  registerCustomer: vi.fn(),
  openSession: vi.fn(),
  closeSession: vi.fn(),
  sessionCustomer: vi.fn(),
  saveAddress: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => deps.jar }));
vi.mock("next/cache", () => ({ refresh: deps.refresh }));
vi.mock("next/navigation", () => ({ redirect: deps.redirect }));
vi.mock("@/lib/account/account-repo", () => ({
  authenticateCustomer: deps.authenticateCustomer,
  registerCustomer: deps.registerCustomer,
  openSession: deps.openSession,
  closeSession: deps.closeSession,
  sessionCustomer: deps.sessionCustomer,
}));
vi.mock("@/lib/account/addresses-repo", () => ({
  isAddressKind: (value: string) => value === "billing" || value === "shipping",
  saveAddress: deps.saveAddress,
}));

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

/** Runs an action, returning its state or the URL it redirected to. */
async function submit(
  action: (state: undefined, data: FormData) => Promise<unknown>,
  fields: Record<string, string>,
) {
  try {
    return { state: await action(undefined, form(fields)) };
  } catch (error) {
    return { redirectedTo: (error as { url?: string }).url };
  }
}

const CUSTOMER = { id: "c_1", email: "ada@example.com" };
const PASSWORD = "correct horse battery";

beforeEach(() => {
  vi.clearAllMocks();
  deps.openSession.mockResolvedValue({ token: "tok", expiresAt: new Date() });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("loginAction", () => {
  it("signs in, sets the session cookie, and comes back to the account page in the form's language", async () => {
    deps.authenticateCustomer.mockResolvedValue(CUSTOMER);

    const result = await submit(loginAction, {
      locale: "de",
      email: " Ada@Example.com ",
      password: PASSWORD,
    });

    expect(result).toEqual({ redirectedTo: "/de/account" });
    expect(deps.authenticateCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ada@example.com", password: PASSWORD }),
    );
    expect(deps.openSession).toHaveBeenCalledWith("c_1", false);
    const [name, token, options] = deps.jar.set.mock.calls[0];
    expect([name, token]).toEqual(["account_session", "tok"]);
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    // Not remembered: a cookie that goes with the browser.
    expect(options).not.toHaveProperty("maxAge");
    expect(deps.refresh).toHaveBeenCalled();
  });

  it("remembers a shopper who ticked the box, with a cookie that outlives the browser", async () => {
    deps.authenticateCustomer.mockResolvedValue(CUSTOMER);

    await submit(loginAction, { locale: "en", email: "ada@example.com", password: PASSWORD, remember: "on" });

    expect(deps.openSession).toHaveBeenCalledWith("c_1", true);
    expect(deps.jar.set.mock.calls[0][2]).toHaveProperty("maxAge", 30 * 24 * 60 * 60);
  });

  it("gives an unknown address and a wrong password the same sentence, and keeps the email", async () => {
    deps.authenticateCustomer.mockResolvedValue(null);

    const result = await submit(loginAction, { locale: "en", email: "ada@example.com", password: "nope" });

    expect(result).toEqual({
      state: { message: "The email address or password is incorrect.", email: "ada@example.com" },
    });
    expect(deps.jar.set).not.toHaveBeenCalled();
  });

  it("asks for the password when it was left empty, not for a longer one", async () => {
    const result = await submit(loginAction, { locale: "en", email: "ada@example.com", password: "" });

    expect(result.state).toMatchObject({ errors: { password: "Enter your password." } });
    expect(deps.authenticateCustomer).not.toHaveBeenCalled();
  });

  it("refuses a malformed email in the form's language", async () => {
    const result = await submit(loginAction, { locale: "fr", email: "ada", password: PASSWORD });

    expect(result.state).toMatchObject({ errors: { email: "Saisissez une adresse e-mail valide." } });
  });

  it("reports a failure as a sentence rather than a crash", async () => {
    deps.authenticateCustomer.mockRejectedValue(new Error("database down"));

    const result = await submit(loginAction, { locale: "en", email: "ada@example.com", password: PASSWORD });

    expect(result.state).toMatchObject({ message: "Something went wrong. Please try again." });
  });

  it("falls back to the default language for a tampered locale", async () => {
    deps.authenticateCustomer.mockResolvedValue(CUSTOMER);

    expect(await submit(loginAction, { locale: "xx", email: "ada@example.com", password: PASSWORD })).toEqual({
      redirectedTo: "/en/account",
    });
  });
});

describe("registerAction", () => {
  const valid = { locale: "en", email: "Ada@Example.com", password: PASSWORD, confirmPassword: PASSWORD };

  it("opens an account in the form's language and signs it in as a browser session", async () => {
    deps.registerCustomer.mockResolvedValue({ status: "created", customer: CUSTOMER });

    const result = await submit(registerAction, { ...valid, locale: "es" });

    expect(result).toEqual({ redirectedTo: "/es/account" });
    expect(deps.registerCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ada@example.com" }),
      "es",
    );
    expect(deps.openSession).toHaveBeenCalledWith("c_1", false);
    expect(deps.jar.set).toHaveBeenCalledWith("account_session", "tok", expect.any(Object));
  });

  it("says when the address already has an account, and signs nobody in", async () => {
    deps.registerCustomer.mockResolvedValue({ status: "taken" });

    const result = await submit(registerAction, valid);

    expect(result.state).toMatchObject({
      message: "An account is already registered with this email address. Log in instead.",
    });
    expect(deps.openSession).not.toHaveBeenCalled();
  });

  it("states the length rule for a short password", async () => {
    const result = await submit(registerAction, { ...valid, password: "short", confirmPassword: "short" });

    expect(result.state).toMatchObject({ errors: { password: "Use at least 8 characters." } });
    expect(deps.registerCustomer).not.toHaveBeenCalled();
  });

  it("puts a mismatch under the confirmation box", async () => {
    const result = await submit(registerAction, { ...valid, confirmPassword: `${PASSWORD}!` });

    expect(result.state).toMatchObject({ errors: { confirmPassword: "The passwords do not match." } });
  });
});

describe("logoutAction", () => {
  it("closes the session the cookie names, deletes the cookie, and returns to the account page", async () => {
    deps.jar.get.mockReturnValue({ value: "tok" });

    let redirectedTo: string | undefined;
    try {
      await logoutAction(form({ locale: "pt" }));
    } catch (error) {
      redirectedTo = (error as { url?: string }).url;
    }

    expect(deps.closeSession).toHaveBeenCalledWith("tok");
    expect(deps.jar.delete).toHaveBeenCalledWith("account_session");
    expect(redirectedTo).toBe("/pt/account");
  });

  it("still deletes the cookie when the row cannot be removed", async () => {
    deps.jar.get.mockReturnValue({ value: "tok" });
    deps.closeSession.mockRejectedValue(new Error("database down"));

    await expect(logoutAction(form({ locale: "en" }))).rejects.toMatchObject({ url: "/en/account" });
    expect(deps.jar.delete).toHaveBeenCalledWith("account_session");
  });
});

describe("saveAddressAction", () => {
  const address = {
    locale: "en",
    kind: "shipping",
    "shipping.countryCode": "CN",
    "shipping.firstName": "Ada",
    "shipping.lastName": "Lovelace",
    "shipping.line1": "1 Century Avenue",
    "shipping.line2": "",
    "shipping.city": "Shanghai",
    "shipping.region": "Shanghai",
    "shipping.postalCode": "200120",
    "shipping.phone": "",
  };

  beforeEach(() => {
    deps.jar.get.mockReturnValue({ value: "sess" });
    deps.sessionCustomer.mockResolvedValue(CUSTOMER);
  });

  it("saves the signed-in customer's address and returns to the address book", async () => {
    const result = await submit(saveAddressAction, address);

    expect(result).toEqual({ redirectedTo: "/en/account/addresses" });
    expect(deps.sessionCustomer).toHaveBeenCalledWith("sess");
    expect(deps.saveAddress).toHaveBeenCalledWith("c_1", "shipping", {
      countryCode: "CN",
      firstName: "Ada",
      lastName: "Lovelace",
      line1: "1 Century Avenue",
      line2: undefined,
      city: "Shanghai",
      region: "Shanghai",
      postalCode: "200120",
      phone: undefined,
    });
  });

  it("holds an address to the checkout's rules, so a saved one is always one checkout takes", async () => {
    const result = await submit(saveAddressAction, {
      ...address,
      "shipping.firstName": " ",
      "shipping.region": "Atlantis",
    });

    expect(result.state).toMatchObject({
      errors: { "shipping.firstName": "This field is required.", "shipping.region": "Choose one from the list." },
    });
    expect(deps.saveAddress).not.toHaveBeenCalled();
  });

  it("refuses a country the shop does not ship to", async () => {
    const result = await submit(saveAddressAction, { ...address, "shipping.countryCode": "ZZ" });

    expect(result.state).toMatchObject({ errors: { "shipping.countryCode": "Choose a country we ship to." } });
  });

  it("saves nothing for a signed-out post, and sends it to log in", async () => {
    deps.sessionCustomer.mockResolvedValue(null);

    expect(await submit(saveAddressAction, address)).toEqual({ redirectedTo: "/en/account" });
    expect(deps.saveAddress).not.toHaveBeenCalled();
  });

  it("saves nothing for a kind that is not an address book entry", async () => {
    expect(await submit(saveAddressAction, { ...address, kind: "admin" })).toEqual({ redirectedTo: "/en/account" });
    expect(deps.saveAddress).not.toHaveBeenCalled();
  });
});
