import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { StarPicker } from "./star-picker";

/*
 * The star picker, driven the way a shopper drives it.
 *
 * A real DOM rather than rendered markup, because every question here is about
 * what happens after an interaction — which star a click chooses, what a hover
 * paints without choosing, and what is left behind when the pointer leaves.
 * Plain DOM queries rather than a testing library, which this project does not
 * have and does not need to find five inputs.
 */

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src?: unknown; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : "mock"} alt={alt ?? ""} />
  ),
}));

let container: HTMLDivElement;
let root: Root;

/**
 * The picker with the state its form keeps for it.
 *
 * Controlled, like the form that renders it: the point of a rating is what the
 * form will submit, and a harness holding the value is what lets the assertions
 * below see it change.
 */
function Harness({ initial }: { initial: number }) {
  const [rating, setRating] = useState(initial);
  return <StarPicker value={rating} onChange={setRating} />;
}

function mount(initial = 0) {
  if (root) act(() => root.unmount());
  container?.remove();

  container = document.createElement("div");
  document.body.append(container);

  act(() => {
    root = createRoot(container);
    root.render(<Harness initial={initial} />);
  });
}

beforeEach(() => {
  mount();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const radios = () =>
  [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')];

/** The star images, in the order they are painted. */
const stars = () =>
  [...container.querySelectorAll("img")].map(
    (image) => image.getAttribute("src") ?? "",
  );

const filled = () => stars().filter((src) => src.includes("star-filled")).length;

/** What the form would submit: the one radio the browser considers checked. */
const chosen = () => radios().find((radio) => radio.checked)?.value;

const click = (element: HTMLElement) =>
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

/** React derives enter/leave events from these, with `bubbles` doing the rest. */
const hover = (element: HTMLElement) =>
  act(() => {
    element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });

const unhover = (element: HTMLElement) =>
  act(() => {
    element.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
  });

/** A star, addressed by the label that wraps it. */
const star = (rating: number) => {
  const label = radios()
    .find((radio) => radio.value === String(rating))
    ?.closest("label");
  if (!label) throw new Error(`no star for ${rating} is rendered`);
  return label;
};

describe("the rating group", () => {
  it("is one choice out of five, named for assistive tech", () => {
    // A radio group rather than five buttons: arrow keys move within it, it is
    // a single tab stop, and the value it holds is one the browser submits.
    expect(radios().map((radio) => radio.value)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    expect(radios().every((radio) => radio.required)).toBe(true);
    expect(radios()[0]?.name).toBe("rating");

    const group = container.querySelector('[role="radiogroup"]');
    const labelId = group?.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(container.querySelector(`#${CSS.escape(labelId ?? "")}`)?.textContent).toContain(
      "Your rating",
    );
  });

  it("gives every star a name of its own", () => {
    // The star itself is decorative; the word next to it is what a screen
    // reader reads, and "1 star" is not "1 stars".
    // The inputs carry `.sr-only` too — the class is what hides them — so the
    // names are the ones with a word in them.
    const names = [...container.querySelectorAll(".sr-only")]
      .map((node) => node.textContent)
      .filter((text) => text !== "");

    expect(names).toEqual(["1 star", "2 stars", "3 stars", "4 stars", "5 stars"]);
  });

  it("starts with nothing chosen and no star filled", () => {
    // Zero is "not answered yet", which is not a rating of zero — the browser's
    // `required` check is what refuses a submission without one.
    expect(chosen()).toBeUndefined();
    expect(filled()).toBe(0);
  });

  it("fills the stars up to the rating it was given", () => {
    mount(3);

    expect(filled()).toBe(3);
    expect(chosen()).toBe("3");
  });
});

describe("choosing a rating", () => {
  it("takes the star that was clicked, and everything before it", () => {
    click(star(4));

    expect(chosen()).toBe("4");
    expect(filled()).toBe(4);
  });

  it("moves to a lower rating as readily as a higher one", () => {
    mount(5);

    click(star(2));

    expect(chosen()).toBe("2");
    expect(filled()).toBe(2);
  });

  it("previews under the cursor without choosing anything", () => {
    // A rating widget that does not react to the pointer reads as broken, and
    // a preview that submitted would be a review nobody wrote.
    hover(star(4));

    expect(filled()).toBe(4);
    expect(chosen()).toBeUndefined();
  });

  it("puts the preview away when the pointer leaves the group", () => {
    mount(2);

    hover(star(5));
    expect(filled()).toBe(5);

    const group = container.querySelector<HTMLElement>('[role="radiogroup"]');
    if (!group) throw new Error("no rating group is rendered");
    unhover(group);

    expect(filled()).toBe(2);
    expect(chosen()).toBe("2");
  });

  it("keeps the ring on the star, not on an invisible input", () => {
    // The input is `sr-only`, so an outline on it would be an outline nobody
    // can see; the class that paints it lives on the star beside it.
    expect(
      container.querySelector('input[type="radio"] + span')?.className,
    ).toContain("peer-focus-visible:ring-2");
  });
});
