import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Review } from "@my-ecommerce/shared";
import { en } from "@/lib/i18n/messages/en";
import { ReviewList } from "./review-list";

/**
 * The review list, asserted through its markup.
 *
 * The component draws what it was handed and decides two things: the count line
 * above the list, and what an empty list says. Both are visible in the HTML, as
 * is the one thing that must never appear there — the reviewer's address.
 */

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src?: unknown; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : "mock"} alt={alt ?? ""} />
  ),
}));

function review(overrides: Partial<Review> = {}): Review {
  return {
    id: "rev_1",
    rating: 5,
    authorName: "Ada",
    body: "it works well, thanks",
    createdAt: "2026-10-12T09:30:00.000Z",
    ...overrides,
  };
}

const render = (reviews: Review[], productName = "Earbud Wireless") =>
  renderToStaticMarkup(
    <ReviewList
      reviews={reviews}
      productName={productName}
      messages={en.reviews}
      locale="en"
    />,
  );

describe("the count above the list", () => {
  it("reads as one review of this product", () => {
    expect(render([review()])).toContain("1 review for Earbud Wireless");
  });

  it("is one element, so it is one column of the section's grid", () => {
    // The list and the form sit side by side in a two-column grid, and a
    // fragment here would make the heading and the list two grid items of
    // their own — the review drawn under the form instead of beside it. One
    // root element is the claim, so the markup is parsed and counted rather
    // than grepped: React also prepends a preload `link` per star icon.
    const parsed = document.createElement("div");
    parsed.innerHTML = render([review()]);

    const roots = [...parsed.children].filter(
      (child) => child.tagName !== "LINK",
    );
    expect(roots).toHaveLength(1);
    expect(roots[0]?.tagName).toBe("DIV");
  });

  it("counts in the plural, and from the list it was given", () => {
    // The count is the list's own length rather than a second number passed
    // alongside it — two numbers would be two things to keep in step.
    const markup = render([review(), review({ id: "rev_2" })]);

    expect(markup).toContain("2 reviews for Earbud Wireless");
  });

  it("says so plainly when there is nothing to list", () => {
    // Not "0 reviews for X": a product nobody has reviewed is a state, and the
    // sentence is the one the section has always shown.
    const markup = render([]);

    expect(markup).toContain("No reviews yet.");
    expect(markup).not.toContain("0 reviews");
  });
});

describe("one review", () => {
  it("carries the author, the date, the stars and the words", () => {
    const markup = render([review({ authorName: "Ada", rating: 4 })]);

    expect(markup).toContain("Ada");
    // The design sets the date in uppercase; the format itself is the `long`
    // style, at UTC so the day cannot depend on where the server runs.
    expect(markup).toContain("October 12, 2026");
    expect(markup).toContain("it works well, thanks");

    // Five stars, four of them filled — this review's own rating, not an
    // average of anything. Counted as images: React also emits a preload
    // `link` per icon, which carries the same path in an `href`.
    expect(markup.match(/<img src="\/icons\/star-filled\.svg"/g)).toHaveLength(4);
    expect(markup.match(/<img src="\/icons\/star-empty\.svg"/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Rated 4 out of 5"');
  });

  it("states a single review's rating without pretending it is an average", () => {
    // The shared star row's own sentence is "from N reviews", which for one row
    // of a list would be both ungrammatical and a lie about what the number is.
    const markup = render([review({ rating: 3 })]);

    expect(markup).not.toContain("from 1 reviews");
    expect(markup).not.toContain("Rated 3 out of 5 from");
  });

  it("never renders the reviewer's address", () => {
    // The address is collected so a moderator can see who wrote something. It is
    // not in the contract the page reads, and this is the assertion that would
    // fail if somebody put it back.
    const markup = render([review()]);

    expect(markup).not.toContain("@");
  });
});
