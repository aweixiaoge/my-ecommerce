import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Review } from "@my-ecommerce/shared";
import { ProductReviews } from "./product-reviews";

/**
 * The section's arrangement: the reviews on one side, the form that adds one on
 * the other, both inside the page's content column.
 *
 * A small claim, and worth one test: which half is which is the whole of this
 * component, and the two halves are tested where they live.
 */
vi.mock("@/app/(storefront)/products/actions", () => ({
  createReviewAction: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src?: unknown; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : "mock"} alt={alt ?? ""} />
  ),
}));

const review: Review = {
  id: "rev_1",
  rating: 4,
  authorName: "Ada",
  body: "Works well.",
  createdAt: "2026-10-12T09:30:00.000Z",
};

const render = (reviews: Review[]) =>
  renderToStaticMarkup(
    <ProductReviews
      reviews={reviews}
      productId="prod_1"
      productName="Earbud Wireless"
    />,
  );

describe("ProductReviews", () => {
  it("puts the reviews beside the form, on the design's two columns", () => {
    const markup = render([review]);

    expect(markup).toContain("1 review for Earbud Wireless");
    expect(markup).toContain("Add a review");
    // Equal columns across, stacking below `bar` — the design's 47.5% pair with
    // the 5% gutter between them.
    expect(markup).toContain("gap-[64px]");
    expect(markup).toContain("bar:grid-cols-2");
    // The form is told which product it is about, and nothing else.
    expect(markup).toContain('name="productId"');
    expect(markup).toContain('value="prod_1"');
  });

  it("is two columns, one element each", () => {
    // The bug this exists for: a column that renders a fragment puts its
    // children straight into the grid, so the review's heading and list land
    // in cells of their own and the form ends up under them.
    const parsed = document.createElement("div");
    parsed.innerHTML = render([review]);

    const grid = [...parsed.querySelectorAll("div")].find((element) =>
      element.className.includes("bar:grid-cols-2"),
    );

    expect(grid?.children).toHaveLength(2);
    expect(grid?.children[0]?.textContent).toContain("1 review for");
    expect(grid?.children[1]?.textContent).toContain("Add a review");
  });

  it("still offers the form when there is nothing to list", () => {
    // The empty state is the left column's; the right one is how the first
    // review ever arrives.
    const markup = render([]);

    expect(markup).toContain("No reviews yet.");
    expect(markup).toContain("Add a review");
  });
});
