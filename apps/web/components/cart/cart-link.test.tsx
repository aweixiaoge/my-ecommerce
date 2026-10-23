import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { en } from "@/lib/i18n/messages/en";
import { CartLink } from "./cart-link";

const render = (count: number, amount = "$0.00") =>
  renderToStaticMarkup(
    <CartLink href="/en/cart" amount={amount} count={count} messages={en.header} />,
  );

describe("CartLink", () => {
  it("is a plain cart with no badge when nothing is in it", () => {
    const markup = render(0);

    expect(markup).toContain('aria-label="Cart"');
    expect(markup).toContain("$0.00");
    expect(markup).not.toContain("rounded-full");
  });

  it("shows the count, and says it aloud", () => {
    const markup = render(2, "$79.00");

    expect(markup).toContain('aria-label="Cart, 2 items"');
    expect(markup).toContain("$79.00");
    expect(markup).toMatch(/rounded-full[^>]*>2<\/span>/);
  });

  it("says item for one", () => {
    expect(render(1)).toContain('aria-label="Cart, 1 item"');
  });

  it("caps the badge so it stays the size of the icon", () => {
    const markup = render(150);

    expect(markup).toContain(">99+<");
    // The spoken name keeps the real figure.
    expect(markup).toContain('aria-label="Cart, 150 items"');
  });
});
