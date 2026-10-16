import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CategoryForm } from "./category-form";

/**
 * The create form, driven the way a person drives it.
 *
 * The server action is mocked, and only it: everything under test is the form's
 * own behaviour — what it submits, and what it shows when the action refuses.
 * The rule the payload has to satisfy is the shared schema's and is tested
 * against it directly.
 */
const actions = vi.hoisted(() => ({
  createCategory: vi.fn(),
}));

/**
 * Tells React this file drives it deliberately.
 *
 * Without it React logs "the current testing environment is not configured to
 * support act" for every update that lands while the action is in flight.
 */
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/app/admin/(shell)/categories/actions", () => ({
  createCategoryAction: actions.createCategory,
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  actions.createCategory.mockReset();

  container = document.createElement("div");
  document.body.append(container);
  act(() => {
    root = createRoot(container);
    root.render(<CategoryForm />);
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const form = () => container.querySelector("form")!;

const nameField = () => container.querySelector<HTMLInputElement>("#name")!;

const findByText = (selector: string, text: string) => {
  const found = [...container.querySelectorAll(selector)].find(
    (element) => element.textContent?.trim() === text,
  );
  if (!found) throw new Error(`no ${selector} reading "${text}" is rendered`);
  return found as HTMLElement;
};

/**
 * Submits the way a browser does.
 *
 * jsdom has no implicit submission, so clicking the button never reaches
 * React's action — the submit event is what does.
 */
async function submit() {
  await act(async () => {
    form().dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

/**
 * Types into a controlled input the way a browser does.
 *
 * Assigning `.value` directly goes through React's own setter, which swallows
 * the change; the native setter plus an `input` event is what React listens to.
 */
async function typeInto(field: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(field),
      "value",
    )!.set!;
    setter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** A promise the test resolves by hand, to observe the form mid-flight. */
function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("CategoryForm", () => {
  it("submits the typed name", async () => {
    await typeInto(nameField(), "Headphones");
    await submit();

    const [, formData] = actions.createCategory.mock.calls[0] as [
      unknown,
      FormData,
    ];
    expect(formData.get("name")).toBe("Headphones");
  });

  it("renders the field error the action returned", async () => {
    // The answer to a refused name belongs next to the box it was typed into,
    // which is the only place a person can act on it.
    actions.createCategory.mockResolvedValue({
      errors: { name: ["Enter a name."] },
    });

    await submit();

    expect(findByText("li", "Enter a name.")).toBeTruthy();
    expect(nameField().getAttribute("aria-describedby")).toBe("name-error");
  });

  it("renders the banner message the action returned", async () => {
    // A failure that is not about the field — the store is down, the session
    // expired — has nothing to point at, so it is announced instead.
    actions.createCategory.mockResolvedValue({
      message: "The category could not be saved.",
    });

    await submit();

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "The category could not be saved.",
    );
  });

  it("keeps what was typed when the action refuses it", async () => {
    // React 19 resets a form when its action resolves. An uncontrolled field
    // would come back empty — and, being `required`, would then refuse the next
    // submit without firing it.
    actions.createCategory.mockResolvedValue({
      errors: { name: ["Name is too long."] },
    });

    await typeInto(nameField(), "A very long name");
    await submit();

    expect(nameField().value).toBe("A very long name");
  });

  it("says it is creating while the action is in flight", async () => {
    // Two submissions of one category is two categories, so the button has to
    // stop taking clicks until the first answer arrives.
    const inFlight = deferred();
    actions.createCategory.mockReturnValue(inFlight.promise);

    await submit();

    expect((findByText("button", "Creating…") as HTMLButtonElement).disabled).toBe(
      true,
    );

    await act(async () =>
      inFlight.resolve({ errors: { name: ["Enter a name."] } }),
    );

    expect(findByText("button", "Create category")).toBeTruthy();
  });
});
