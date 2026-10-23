import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { AccountOrderRow } from "@/lib/account/orders-repo";
import { de } from "@/lib/i18n/messages/de";
import { en } from "@/lib/i18n/messages/en";
import { AccountDashboard } from "./account-dashboard";
import { AccountOrders } from "./account-orders";
import { AccountShell } from "./account-shell";

vi.mock("@/app/[lang]/account/actions", () => ({ logoutAction: vi.fn() }));

const order: AccountOrderRow = {
  orderNumber: 243,
  createdAt: "2026-10-14T09:30:00.000Z",
  status: "processing",
  grandTotal: { amount: "56.00", currency: "USD" },
  display: { code: "USD", options: [{ code: "USD", rate: "1" }] },
  itemCount: 3,
  accessKey: "k/1",
};

const document = (html: string) => new DOMParser().parseFromString(html, "text/html");

describe("AccountOrders", () => {
  it("draws the design's row: number, date, status, total for the units, and View", () => {
    const page = document(renderToStaticMarkup(<AccountOrders orders={[order]} locale="en" messages={en.account} />));
    const cells = [...page.querySelectorAll("table tbody tr > *")].map((cell) => cell.textContent);

    expect(cells).toEqual(["#243", "October 14, 2026", "Processing", "$56.00 for 3 items", "View"]);
  });

  it("opens the order's confirmation page with its key, in the reader's language", () => {
    const page = document(renderToStaticMarkup(<AccountOrders orders={[order]} locale="de" messages={de.account} />));
    const view = page.querySelector("table a")!;

    expect(view.getAttribute("href")).toBe("/de/checkout/order-received/243?key=k%2F1");
    expect(view.getAttribute("aria-label")).toBe("Bestellung 243 ansehen");
  });

  it("writes one item in the singular", () => {
    const html = renderToStaticMarkup(
      <AccountOrders orders={[{ ...order, itemCount: 1 }]} locale="en" messages={en.account} />,
    );

    expect(html).toContain("$56.00 for 1 item");
  });

  it("shows a total in the currency the order was placed in", () => {
    const html = renderToStaticMarkup(
      <AccountOrders
        orders={[
          {
            ...order,
            display: { code: "EUR", options: [{ code: "USD", rate: "1" }, { code: "EUR", rate: "0.5" }] },
          },
        ]}
        locale="en"
        messages={en.account}
      />,
    );

    expect(html).toContain("€28.00 for 3 items");
  });

  it("says when there are no orders, and points at the shop", () => {
    const page = document(renderToStaticMarkup(<AccountOrders orders={[]} locale="en" messages={en.account} />));

    expect(page.body.textContent).toContain("No order has been made yet.");
    expect(page.querySelector("a")!.getAttribute("href")).toBe("/en/shop");
    expect(page.querySelector("table")).toBeNull();
  });
});

describe("AccountShell", () => {
  it("marks the tab being shown, and signs out with a form rather than a link", () => {
    const page = document(
      renderToStaticMarkup(
        <AccountShell active="orders" locale="en" messages={en.account}>
          <p>tab</p>
        </AccountShell>,
      ),
    );

    const current = page.querySelector('[aria-current="page"]')!;
    expect(current.textContent).toBe("Orders");
    expect(current.getAttribute("href")).toBe("/en/account/orders");
    expect(page.querySelector("form button")!.textContent).toBe("Log out");
    expect([...page.querySelectorAll("nav a")].map((link) => link.textContent)).toEqual(["Dashboard", "Orders", "Addresses"]);
  });
});

describe("AccountDashboard", () => {
  it("greets the customer by email, twice in bold, with Log out inside the sentence", () => {
    const page = document(
      renderToStaticMarkup(<AccountDashboard email="ada@example.com" locale="en" messages={en.account} />),
    );
    const greeting = page.querySelector("form p")!;

    expect(greeting.textContent).toBe("Hello ada@example.com (not ada@example.com? Log out)");
    expect(greeting.querySelectorAll("strong")).toHaveLength(2);
    expect(greeting.querySelector("button[type=submit]")!.textContent).toBe("Log out");
  });

  it("links the recent orders to the Orders tab", () => {
    const page = document(
      renderToStaticMarkup(<AccountDashboard email="ada@example.com" locale="fr" messages={en.account} />),
    );

    expect(page.querySelector('a[href="/fr/account/orders"]')!.textContent).toBe("recent orders");
    expect(page.querySelector('a[href="/fr/account/addresses"]')!.textContent).toBe(
      "shipping and billing addresses",
    );
  });
});
