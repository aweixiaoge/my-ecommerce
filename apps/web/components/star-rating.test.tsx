import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StarRating } from "./star-rating";

/**
 * Components are asserted through their rendered markup rather than a DOM
 * library. `renderToStaticMarkup` is already in the dependency tree, and what
 * this component has to get right — how many stars are painted, and whether
 * a screen reader gets a sentence or five stray images — is all visible in the
 * HTML.
 */
const stars = (markup: string) =>
  [...markup.matchAll(/src="([^"]*star-(?:filled|empty)[^"]*)"/g)].map((m) => m[1]);

describe("StarRating", () => {
  it("paints five stars, one per step of the scale", () => {
    expect(stars(renderToStaticMarkup(<StarRating rating={{ average: 3, count: 1 }} />))).toHaveLength(5);
  });

  it("fills the stars the average rounds to", () => {
    const markup = renderToStaticMarkup(<StarRating rating={{ average: 4.2, count: 9 }} />);

    expect(stars(markup).filter((s) => s.includes("filled"))).toHaveLength(4);
    expect(stars(markup).filter((s) => s.includes("empty"))).toHaveLength(1);
  });

  it("rounds .5 and above up, because the design has no half star to draw", () => {
    const markup = renderToStaticMarkup(<StarRating rating={{ average: 4.6, count: 9 }} />);

    expect(stars(markup).filter((s) => s.includes("filled"))).toHaveLength(5);
  });

  it("fills none of the stars for an average of zero", () => {
    const markup = renderToStaticMarkup(<StarRating rating={{ average: 0, count: 0 }} />);

    expect(stars(markup).filter((s) => s.includes("filled"))).toHaveLength(0);
  });

  it("renders nothing at all when a product has no reviews", () => {
    // Not an empty star row: five pale stars reads as a one-star verdict on a
    // product nobody has rated.
    expect(renderToStaticMarkup(<StarRating rating={null} />)).toBe("");
  });

  it("gives assistive tech the figure once, not five images", () => {
    const markup = renderToStaticMarkup(<StarRating rating={{ average: 4.2, count: 98 }} />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain("Rated 4.2 out of 5 from 98 reviews");

    // Every star is decorative. With an alt of their own they would be read out
    // one after another, on top of the label above.
    expect(markup.match(/<img[^>]*alt=""/g)).toHaveLength(5);
  });

  it("lets a caller replace the sentence, for a figure that is not an average", () => {
    // A single review's row: its rating *is* the count, and "from 1 reviews" is
    // both ungrammatical and wrong about what the stars mean.
    const markup = renderToStaticMarkup(
      <StarRating rating={{ average: 4, count: 1 }} label="4 out of 5" />,
    );

    expect(markup).toContain('aria-label="4 out of 5"');
    expect(markup).not.toContain("from 1 reviews");
  });

  it("passes a caller's spacing through to the row", () => {
    const markup = renderToStaticMarkup(
      <StarRating rating={{ average: 4, count: 1 }} className="mt-[11px]" />,
    );

    expect(markup).toContain("mt-[11px]");
  });
});
