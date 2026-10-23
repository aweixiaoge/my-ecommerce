import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { CouponForEdit } from "@/lib/admin/coupons-repo";
import { CouponForm } from "./coupon-form";

/**
 * The coupon form in its two modes. The Server Actions are mocked and only
 * they: under test is what the form starts from and what it sends.
 */
const actions = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));

// See `review-form.test.tsx`: this file drives React deliberately.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/app/admin/(shell)/coupons/actions", () => ({
  createCouponAction: actions.create,
  updateCouponAction: actions.update,
}));

const products = [
  { id: "prod_a", name: "Aurora Wireless Earbuds", status: "active" },
  { id: "prod_b", name: "Renamed Product", status: "draft" },
  { id: "prod_c", name: "Smart Watch", status: "active" },
];

const coupon: CouponForEdit = {
  id: "cpn_1",
  code: "8KJT9EH33V",
  type: "fixed_amount",
  amount: "5.50",
  appliesToAllProducts: false,
  productIds: ["prod_a", "prod_b"],
  expiresAt: "2026-12-31T07:59:00.000Z",
  updatedAt: "2026-10-22T08:00:00.000Z",
};

let container: HTMLDivElement;
let root: Root;

function mount(props: { coupon?: CouponForEdit } = {}) {
  container = document.createElement("div");
  document.body.append(container);
  act(() => {
    root = createRoot(container);
    root.render(<CouponForm products={products} currency="USD" {...props} />);
  });
}

beforeEach(() => {
  actions.create.mockReset().mockResolvedValue(undefined);
  actions.update.mockReset().mockResolvedValue(undefined);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const input = (selector: string) => container.querySelector<HTMLInputElement>(selector)!;

async function submit() {
  await act(async () => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

describe("CouponForm, editing", () => {
  it("starts from the coupon", () => {
    mount({ coupon });

    expect(input("#code").value).toBe("8KJT9EH33V");
    expect(input('input[name="type"][value="fixed_amount"]').checked).toBe(true);
    expect(input("#amount").value).toBe("5.50");
    expect(input('input[name="appliesTo"][value="selected"]').checked).toBe(true);
    expect(container.textContent).toContain("2 selected");
    expect(
      [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].map(
        (box) => box.checked,
      ),
    ).toEqual([true, true, false]);
    // In the browser's own time — which is the test runner's.
    const expected = new Date(coupon.expiresAt);
    expect(input("#expiresAtLocal").value).toBe(
      `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, "0")}-${String(
        expected.getDate(),
      ).padStart(2, "0")}T${String(expected.getHours()).padStart(2, "0")}:${String(
        expected.getMinutes(),
      ).padStart(2, "0")}`,
    );
    expect(container.querySelector('button[type="submit"]')?.textContent).toBe("Save changes");
  });

  it("sends the update action the id and the unchanged expiry instant", async () => {
    mount({ coupon });

    await submit();

    expect(actions.create).not.toHaveBeenCalled();
    const data = actions.update.mock.calls[0]?.[1] as FormData;
    expect(data.get("id")).toBe("cpn_1");
    expect(data.get("code")).toBe("8KJT9EH33V");
    expect(data.getAll("productIds")).toEqual(["prod_a", "prod_b"]);
    expect(data.get("expiresAt")).toBe("2026-12-31T07:59:00.000Z");
  });
});

describe("CouponForm, creating", () => {
  it("starts empty and sends the create action with no id", async () => {
    mount();

    expect(input("#code").value).toBe("");
    expect(input('input[name="type"][value="percentage"]').checked).toBe(true);
    expect(input("#expiresAtLocal").value).toBe("");
    expect(container.querySelector('button[type="submit"]')?.textContent).toBe("Create coupon");

    await submit();

    const data = actions.create.mock.calls[0]?.[1] as FormData;
    expect(data.has("id")).toBe(false);
    expect(actions.update).not.toHaveBeenCalled();
  });
});
