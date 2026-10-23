import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateCouponAction } from "./actions";

/**
 * The edit action, with the session, the repository and Next's redirect stood
 * in for. What is left is what the action decides: who may save, which id,
 * what is refused and with what words, and where a save goes.
 */
const deps = vi.hoisted(() => ({
  getSession: vi.fn(),
  updateCoupon: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));

vi.mock("next/navigation", () => ({ redirect: deps.redirect }));
// The repository's error classes are real; its client is not needed by them.
vi.mock("@my-ecommerce/db", () => ({ prisma: {} }));
vi.mock("@/lib/admin/session", () => ({ getSession: deps.getSession }));
vi.mock("@/lib/admin/coupons-repo", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/admin/coupons-repo")>("@/lib/admin/coupons-repo");
  return { ...actual, createCoupon: vi.fn(), updateCoupon: deps.updateCoupon };
});

const { CouponNotFoundError, DuplicateCouponCodeError } = await import("@/lib/admin/coupons-repo");

const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

function form(fields: Record<string, string | string[]> = {}) {
  const data = new FormData();
  const all: Record<string, string | string[]> = {
    id: "cpn_1",
    code: "take5",
    type: "fixed_amount",
    amount: "5.00",
    appliesTo: "selected",
    productIds: ["prod_a", "prod_b"],
    expiresAt: FUTURE,
    ...fields,
  };
  for (const [name, value] of Object.entries(all)) {
    for (const one of [value].flat()) data.append(name, one);
  }
  return data;
}

/** Runs the action and returns where it redirected to, or its state. */
async function save(data: FormData) {
  try {
    return { state: await updateCouponAction(undefined, data) };
  } catch (error) {
    return { redirectedTo: (error as { url?: string }).url };
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  deps.getSession.mockResolvedValue({ userId: "admin_1" });
  deps.updateCoupon.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("updateCouponAction", () => {
  it("saves the coupon under its id and goes back to the list", async () => {
    expect(await save(form())).toEqual({ redirectedTo: "/admin/coupons" });
    expect(deps.updateCoupon).toHaveBeenCalledWith("cpn_1", {
      code: "TAKE5",
      type: "fixed_amount",
      amount: "5.00",
      appliesToAllProducts: false,
      productIds: ["prod_a", "prod_b"],
      expiresAt: FUTURE,
    });
  });

  it("refuses without a session, and saves nothing", async () => {
    deps.getSession.mockResolvedValue(null);

    expect((await save(form())).state).toEqual({
      message: "Your session has expired. Sign in again.",
    });
    expect(deps.updateCoupon).not.toHaveBeenCalled();
  });

  it("refuses a form without an id", async () => {
    expect((await save(form({ id: "" }))).state?.message).toMatch(/could not be identified/);
    expect(deps.updateCoupon).not.toHaveBeenCalled();
  });

  it("holds an edit to the create rules, field by field", async () => {
    const { state } = await save(
      form({ type: "percentage", amount: "150", expiresAt: "2020-01-01T00:00:00.000Z" }),
    );

    expect(state?.errors).toEqual({
      amount: ["A percentage cannot be more than 100."],
      expiresAt: ["Choose an expiry date in the future."],
    });
    expect(deps.updateCoupon).not.toHaveBeenCalled();
  });

  it("puts a taken code under the code box", async () => {
    deps.updateCoupon.mockRejectedValue(new DuplicateCouponCodeError());

    expect((await save(form())).state).toEqual({
      errors: { code: ["Another coupon already uses this code."] },
    });
  });

  it("says when the coupon is gone", async () => {
    deps.updateCoupon.mockRejectedValue(new CouponNotFoundError());

    expect((await save(form())).state?.message).toMatch(/no longer exists/);
  });

  it("says it failed, rather than throwing, when the database does", async () => {
    deps.updateCoupon.mockRejectedValue(new Error("down"));

    expect((await save(form())).state?.message).toMatch(/could not be saved/);
  });
});
