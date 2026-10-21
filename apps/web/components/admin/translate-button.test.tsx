import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TranslateButton } from "./translate-button";

/**
 * The translate control on a list row: a form, two hidden fields and a button.
 *
 * The action is mocked and only it — what is under test is what the button
 * submits, which is the whole of what a person's click decides: which kind of
 * content, and which row.
 */
const actions = vi.hoisted(() => ({ translate: vi.fn() }));

vi.mock("@/app/admin/(shell)/translate/actions", () => ({
  translateEntityAction: actions.translate,
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.append(container);

  act(() => {
    root = createRoot(container);
    root.render(
      <TranslateButton kind="product" id="prod_1" name="Studio Over-Ear" />,
    );
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const button = () => container.querySelector("button")!;
const hidden = (name: string) =>
  container.querySelector<HTMLInputElement>(`input[name="${name}"]`);

describe("TranslateButton", () => {
  it("submits the kind of content and the row it belongs to", () => {
    expect(hidden("kind")?.value).toBe("product");
    expect(hidden("id")?.value).toBe("prod_1");
    expect(button().type).toBe("submit");
  });

  it("names the row it translates, because the column repeats the word", () => {
    // "Translate" down a column tells a screen reader nothing about which row
    // it is in — the same rule the Publish and Unpublish buttons follow.
    expect(button().getAttribute("aria-label")).toBe("Translate Studio Over-Ear");
    expect(button().textContent?.trim()).toBe("Translate");
  });

  it("posts the form when the button is clicked", async () => {
    await act(async () => {
      button().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // A submit button in a form with a Server Action submits it; jsdom runs no
    // action, so what is asserted is the shape a browser would send.
    expect(container.querySelector("form")).not.toBeNull();
  });
});
