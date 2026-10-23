import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { en } from "@/lib/i18n/messages/en";
import { ReviewForm } from "./review-form";

/**
 * The review form, driven the way a person drives it.
 *
 * The server action is mocked, and only it: everything under test is the form's
 * own behaviour — what it submits, what it does with what comes back, and what
 * it does with what a person typed when the answer is a refusal. The rules the
 * payload has to satisfy are the shared schema's and are tested against it
 * directly.
 */
const actions = vi.hoisted(() => ({ createReview: vi.fn() }));

/**
 * Tells React this file drives it deliberately.
 *
 * Without it React logs "the current testing environment is not configured to
 * support act" for every update that lands while an action is in flight — which
 * is all of them here.
 */
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/app/[lang]/products/actions", () => ({
  createReviewAction: actions.createReview,
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src?: unknown; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : "mock"} alt={alt ?? ""} />
  ),
}));

let container: HTMLDivElement;
let root: Root;

function mount() {
  if (root) act(() => root.unmount());
  container?.remove();

  container = document.createElement("div");
  document.body.append(container);

  act(() => {
    root = createRoot(container);
    root.render(
      <ReviewForm productId="prod_1" messages={en.reviews.form} locale="en" />,
    );
  });
}

beforeEach(() => {
  actions.createReview.mockReset();
  mount();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const form = () => container.querySelector("form");
const field = <T extends HTMLElement>(selector: string) => {
  const found = container.querySelector<T>(selector);
  if (!found) throw new Error(`no element matching ${selector} is rendered`);
  return found;
};

/**
 * Types into a controlled field the way a browser does.
 *
 * Assigning `.value` directly goes through React's own setter, which swallows
 * the change; the native setter plus an `input` event is what React listens to.
 */
async function typeInto(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(element),
      "value",
    )!.set!;
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/**
 * Submits the form.
 *
 * A `submit` event, not a click on the button: jsdom does not implement the
 * implicit submission a button press performs in a browser, so a click there
 * never reaches React's action. The event is what the action is attached to, so
 * this drives the same path.
 */
async function submit() {
  await act(async () => {
    form()?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
}

/** Fills in a complete review. */
async function fillIn() {
  await typeInto(field<HTMLInputElement>("#authorName"), "Ada");
  await typeInto(field<HTMLInputElement>("#authorEmail"), "ada@example.com");
  await typeInto(field<HTMLTextAreaElement>("#body"), "Works well.");
  await act(async () => {
    field<HTMLInputElement>('input[name="rating"][value="4"]').click();
  });
}

/** The `FormData` the action was handed. */
const submitted = () =>
  actions.createReview.mock.calls[0]?.[1] as FormData | undefined;

describe("what the form submits", () => {
  it("sends the product it belongs to, and the four answers", async () => {
    actions.createReview.mockResolvedValue({ ok: true });

    await fillIn();
    await submit();

    const data = submitted();
    expect(data?.get("productId")).toBe("prod_1");
    expect(data?.get("authorName")).toBe("Ada");
    expect(data?.get("authorEmail")).toBe("ada@example.com");
    expect(data?.get("rating")).toBe("4");
    expect(data?.get("body")).toBe("Works well.");
  });

  it("sends the language the page was read in", async () => {
    // The action is a POST, not a render of a route, so it cannot read the
    // URL's language segment — the form is how it learns which language to
    // answer a refusal in, and which language to file the review under.
    actions.createReview.mockResolvedValue({ ok: true });

    await fillIn();
    await submit();

    expect(submitted()?.get("locale")).toBe("en");
  });

  it("carries the design's labels and the shared bounds", () => {
    // The label and the input are one control as far as assistive tech is
    // concerned, and a person is stopped by `maxLength` before the round trip
    // rather than after it.
    expect(container.querySelector('label[for="authorName"]')?.textContent).toBe(
      "Name*",
    );
    expect(field<HTMLInputElement>("#authorName").maxLength).toBe(80);
    expect(field<HTMLInputElement>("#authorEmail").maxLength).toBe(200);
    expect(field<HTMLTextAreaElement>("#body").maxLength).toBe(4000);
    expect(field<HTMLInputElement>("#authorEmail").type).toBe("email");
  });
});

describe("what the form does with the answer", () => {
  it("shows a refusal beside the box it belongs to", async () => {
    actions.createReview.mockResolvedValue({
      errors: { authorEmail: ["Enter a valid email address."] },
    });

    await submit();

    expect(container.textContent).toContain("Enter a valid email address.");
    const email = field<HTMLInputElement>("#authorEmail");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(email.getAttribute("aria-describedby")).toBe("authorEmail-error");
    // The complaint is attached to the box, so the message is not read out
    // before somebody has reached the field it is about.
    expect(container.querySelector("#authorEmail-error")?.textContent).toBe(
      "Enter a valid email address.",
    );
  });

  it("announces a refusal with no field to sit beside", async () => {
    // The rating has no box of its own — the stars are the control — so its
    // message has to announce itself instead.
    actions.createReview.mockResolvedValue({
      errors: { rating: ["Choose between 1 and 5 stars."] },
    });

    await submit();

    const announced = container.querySelector('#rating-error[role="alert"]');
    expect(announced?.textContent).toBe("Choose between 1 and 5 stars.");
  });

  it("keeps what was typed when the submission is refused", async () => {
    // React resets a form when its action resolves, so anything the DOM is
    // holding comes back empty — and on a `required` field the browser then
    // blocks the next submit without firing one, which reads as a broken
    // button.
    actions.createReview.mockResolvedValue({
      errors: { authorName: ["Enter your name."], body: ["Write your review."] },
    });

    await fillIn();
    await submit();

    expect(field<HTMLInputElement>("#authorName").value).toBe("Ada");
    expect(field<HTMLInputElement>("#authorEmail").value).toBe("ada@example.com");
    expect(field<HTMLTextAreaElement>("#body").value).toBe("Works well.");
    // Both refusals are attached to their boxes, and neither field is marked
    // invalid without one.
    expect(field<HTMLInputElement>("#authorName").getAttribute("aria-describedby")).toBe(
      "authorName-error",
    );
    expect(field<HTMLInputElement>("#authorEmail").getAttribute("aria-describedby")).toBeNull();
  });

  it("shows a failure that belongs to no field at all", async () => {
    actions.createReview.mockResolvedValue({
      message: "That product is no longer available, so there is nothing to review.",
    });

    await submit();

    const alert = container.querySelector('[role="alert"][aria-live="polite"]');
    expect(alert?.textContent).toContain("no longer available");
  });

  it("thanks the reviewer once the review is stored", async () => {
    actions.createReview.mockResolvedValue({ ok: true });

    await fillIn();
    await submit();

    // The form is gone rather than sitting filled-in behind a message, which
    // would read as a submit that did not work.
    expect(form()).toBeNull();
    expect(container.textContent).toContain("Thank you for your review");
  });

  it("reads as sending while the action is still in flight", async () => {
    let settle: (state: unknown) => void = () => {};
    actions.createReview.mockImplementation(
      () => new Promise((resolve) => (settle = resolve)),
    );

    await fillIn();
    await submit();

    expect(field<HTMLButtonElement>('button[type="submit"]').textContent).toBe(
      "Sending…",
    );
    expect(field<HTMLButtonElement>('button[type="submit"]').disabled).toBe(true);

    await act(async () => {
      settle({ ok: true });
    });

    expect(container.textContent).toContain("Thank you for your review");
  });
});
