import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { displayCurrency, type DisplayCurrency } from "@/lib/currency/display";
import { en } from "@/lib/i18n/messages/en";
import { CurrencySwitcher, CurrencyTrigger } from "./currency-switcher";

/*
 * The control the design draws beside the language switcher, asserted the same
 * way that one is: from the DOM a browser would show, with the classes standing
 * in for the design's measurements and media queries.
 *
 * The difference between the two controls is what a row *is*, and that is what
 * most of this file is about: a currency row is a submit button in a form
 * rather than a link, because the choice is a cookie and the address the reader
 * can share does not change.
 */

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src?: unknown; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : "mock"} alt={alt ?? ""} />
  ),
}));

/** The action is a server module — it reads the cookie jar and reaches the
 *  database. Mocked at that boundary, which is the one thing jsdom cannot be:
 *  what is asserted below is that a row hands it the right code. */
const setCurrency = vi.hoisted(() =>
  vi.fn<(formData: FormData) => Promise<void>>(async () => {}),
);

vi.mock("@/app/[lang]/currency-actions", () => ({ setCurrency }));

/** The three currencies the migration seeds, built by the function the request
 *  builds them with — so the menu's order and the active row are asserted
 *  against the real table rather than a hand-written copy of it. */
const offered = (chosen: string): DisplayCurrency =>
  displayCurrency(
    [
      { base: "USD", quote: "EUR", rate: "0.92" },
      { base: "USD", quote: "GBP", rate: "0.79" },
    ],
    chosen,
  );

let container: HTMLDivElement;
let root: Root;

const render = (display: DisplayCurrency, placement: "nav" | "bar") => {
  act(() => {
    root = createRoot(container);
    root.render(
      <CurrencySwitcher
        display={display}
        messages={en.header}
        placement={placement}
      />,
    );
  });
};

beforeEach(() => {
  setCurrency.mockClear();
  container = document.createElement("div");
  document.body.append(container);
  render(offered("EUR"), "bar");
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const trigger = () =>
  container.querySelector<HTMLButtonElement>("button[aria-controls]")!;

/** The wrapper the trigger sits in: what carries the placement, and what the
 *  menu's `top-full` is measured from. */
const wrapper = () => trigger().parentElement!;

const panel = () =>
  document.getElementById(trigger().getAttribute("aria-controls")!)!;

const form = () => panel().querySelector("form")!;

const rows = () => [...panel().querySelectorAll<HTMLButtonElement>("li > button")];

const classesOf = (element: Element) => element.className.split(/\s+/);

/** A press: the pointer down a browser sends before the click, then the click.
 *  Both are dispatched because the component listens for both, and a test that
 *  only clicked would leave the outside-press path unexercised. */
const press = async (element: Element) => {
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, cancelable: true }),
    );
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  });
};

const pressOutside = async () => {
  await act(async () => {
    document.body.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, cancelable: true }),
    );
  });
};

const typeKey = async (key: string) => {
  await act(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
};

const isOpen = () => trigger().getAttribute("aria-expanded") === "true";

describe("CurrencySwitcher — the closed control", () => {
  it("shows the currency prices are written in, and names itself after it", () => {
    expect(trigger().textContent?.trim()).toBe("EUR");
    expect(trigger().getAttribute("aria-label")).toBe("Currency: EUR");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps the menu in the document but hidden, so its rows are never tabbable", () => {
    expect(classesOf(panel())).toContain("hidden");
    expect(classesOf(panel())).not.toContain("block");
  });

  it("hangs the menu from the bar's edge rather than the trigger's box", () => {
    // The pair opens at one height or the two menus open at two: `relative` and
    // `h-full` on the wrapper are what the panel's `top-full` is measured from.
    expect(classesOf(wrapper())).toEqual(
      expect.arrayContaining(["relative", "h-full"]),
    );
    expect(classesOf(panel())).toContain("top-full");
  });
});

describe("CurrencySwitcher — the two placements", () => {
  it("leaves the bar's copy showing wherever the nav is collapsed", async () => {
    const classes = classesOf(wrapper());
    expect(classes).toContain("lg:hidden");
    // A bare `hidden` next to `lg:hidden` would be unconditional, and would
    // take the only currency control on the site away at every width.
    expect(classes).not.toContain("hidden");
  });

  it("holds the nav's copy back to `lg`", async () => {
    await act(async () => root.unmount());
    render(offered("EUR"), "nav");

    const classes = classesOf(wrapper());
    expect(classes).toContain("lg:flex");
    expect(classes).toContain("hidden");
    expect(classes).not.toContain("lg:hidden");
  });
});

describe("CurrencySwitcher — the open menu", () => {
  it("opens on a press and closes on the next one", async () => {
    await press(trigger());
    expect(isOpen()).toBe(true);
    expect(classesOf(panel())).toContain("block");

    await press(trigger());
    expect(isOpen()).toBe(false);
  });

  it("draws the language menu's box, because the design draws them as a pair", () => {
    expect(classesOf(panel())).toEqual(
      expect.arrayContaining(["w-[180px]", "p-2", "rounded-[3px]", "border-[#d4d4d4]", "bg-paper"]),
    );

    for (const row of rows()) {
      expect(classesOf(row)).toEqual(
        expect.arrayContaining([
          "h-9",
          "pl-3",
          "pr-2.5",
          "gap-2",
          "rounded-[3px]",
          "text-[13px]",
        ]),
      );
    }
  });

  it("lists every currency on offer, the shop's own first", () => {
    expect(rows().map((row) => row.textContent)).toEqual(["USD", "EUR", "GBP"]);
  });

  it("offers only the shop's currency when the shop has no rates", async () => {
    await act(async () => root.unmount());
    render(displayCurrency([]), "bar");

    expect(rows().map((row) => row.textContent)).toEqual(["USD"]);
  });

  it("submits the chosen code, so the cookie is set by the action and not here", async () => {
    const row = rows().find((candidate) => candidate.value === "GBP")!;

    expect(row.type).toBe("submit");
    expect(row.name).toBe("currency");
    expect(form().contains(row)).toBe(true);

    // The form is what carries it: no href, no handler, one field per row.
    await act(async () => {
      row.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });

    expect(setCurrency).toHaveBeenCalledTimes(1);
    expect(setCurrency.mock.calls[0]![0].get("currency")).toBe("GBP");
  });

  it("marks the currency in use, and only that one", () => {
    const current = rows().find(
      (row) => row.getAttribute("aria-current") === "true",
    );
    expect(current?.textContent).toBe("EUR");

    // The design marks it three ways: bold, the grey fill, and the check.
    expect(classesOf(current!)).toContain("font-bold");
    expect(classesOf(current!)).toContain("bg-[#f2f2f2]");
    expect(current!.querySelector('img[src*="check"]')).not.toBeNull();

    for (const row of rows().filter((candidate) => candidate !== current)) {
      expect(classesOf(row)).toContain("font-normal");
      expect(row.querySelector('img[src*="check"]')).toBeNull();
    }
  });

  it("closes when a currency is chosen", async () => {
    await press(trigger());

    await press(rows()[1]!);
    expect(isOpen()).toBe(false);
  });

  it("closes when the pointer goes down anywhere else", async () => {
    await press(trigger());

    await pressOutside();
    expect(isOpen()).toBe(false);
  });

  it("closes on Escape", async () => {
    await press(trigger());

    await typeKey("Escape");
    expect(isOpen()).toBe(false);
  });

  it("stays open on any other key", async () => {
    await press(trigger());

    await typeKey("ArrowDown");
    expect(isOpen()).toBe(true);
  });
});

describe("CurrencyTrigger", () => {
  it("draws the trigger and its placement without claiming to open a menu", () => {
    // What the header renders while the read is in flight: the row's geometry,
    // so nothing moves when the real control arrives.
    act(() => {
      root.render(<CurrencyTrigger currency="USD" placement="bar" />);
    });

    const span = container.querySelector("span")!;
    expect(span.textContent?.trim()).toBe("USD");
    expect(container.querySelector("button")).toBeNull();
    expect(classesOf(span.parentElement!)).toContain("lg:hidden");
  });
});
