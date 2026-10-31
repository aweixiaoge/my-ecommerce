import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { en } from "@/lib/i18n/messages/en";
import { LANGUAGES } from "@/lib/languages";
import { DEFAULT_LOCALE } from "@/lib/locale";
import { LanguageSwitcher } from "./language-switcher";

/*
 * jsdom never lays out the document, so what is asserted from the classes is
 * the same thing the header's own test asserts from them: which element
 * carries the design's measurements and which media query decides its
 * visibility. The behaviour — open, close, mark — is asserted from the DOM,
 * where a real browser would show it.
 *
 * Plain DOM queries rather than a testing library, for the reason the header
 * test gives: the assertions are about attributes, and the harness would be a
 * dependency bought for nothing.
 */

/** `next/image` is mocked to its underlying element; `next/link` is left
 *  as-is, which is what makes the href assertions below meaningful. */
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src?: unknown; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : "mock"} alt={alt ?? ""} />
  ),
}));

/** A row is this page in another language, so the switcher reads the address
 *  it is on — and jsdom is not a Next render. The pathname is handed to it:
 *  `/en/shop` is a page with both a language and a route in it, which is what
 *  the swap works on. */
vi.mock("next/navigation", () => ({ usePathname: () => "/en/shop" }));

let container: HTMLDivElement;
let root: Root;

const render = (placement: "nav" | "bar") => {
  act(() => {
    root = createRoot(container);
    root.render(
      <LanguageSwitcher
        locale="en"
        messages={en.header}
        placement={placement}
      />,
    );
  });
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  render("bar");
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

/** The switcher's trigger — the header's other `aria-controls` button. */
const trigger = () =>
  container.querySelector<HTMLButtonElement>("button[aria-controls]")!;

/** The wrapper the trigger sits in: what carries the placement, and what the
 *  menu's `top-full` is measured from. */
const wrapper = () => trigger().parentElement!;

const panel = () => document.getElementById(trigger().getAttribute("aria-controls")!)!;

const rows = () =>
  [...panel().querySelectorAll<HTMLAnchorElement>("li > a")];

const classesOf = (element: Element) => element.className.split(/\s+/);

/** A press: the pointer down a browser sends before the click, then the click.
 *  Both are dispatched because the component listens for both, and a test that
 *  only clicked would leave the outside-press path unexercised. */
const press = async (element: Element) => {
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, cancelable: true }),
    );

    // `next/link` navigates on click, and jsdom would then try to load a route
    // it has no server for. Cancelling in the capture phase stops the native
    // default before that happens; React's own handlers still receive the
    // event, so the component behaves exactly as it would in a browser.
    const cancelNavigation = (event: Event) => event.preventDefault();
    document.addEventListener("click", cancelNavigation, { capture: true });
    try {
      element.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    } finally {
      document.removeEventListener("click", cancelNavigation, { capture: true });
    }
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
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true }),
    );
  });
};

const isOpen = () => trigger().getAttribute("aria-expanded") === "true";

describe("LanguageSwitcher — the closed control", () => {
  it("shows the current language's code, and names itself after it", () => {
    // The design's closed switcher reads `EN`, and its menu lists `English` —
    // the code on the trigger, the name in the list.
    expect(trigger().textContent?.trim()).toBe(DEFAULT_LOCALE.toUpperCase());
    expect(trigger().getAttribute("aria-label")).toBe(
      `Language: ${DEFAULT_LOCALE.toUpperCase()}`,
    );
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps the menu in the document but hidden, so its rows are never tabbable", () => {
    expect(classesOf(panel())).toContain("hidden");
    expect(classesOf(panel())).not.toContain("block");
  });

  it("hangs the menu from the bar's edge rather than the trigger's box", () => {
    // `relative` and `h-full` on the wrapper are what the menu's `top-full`
    // is measured from — a trigger sized to its own text would open the menu
    // over the bar's lower half. See the component's note.
    expect(classesOf(wrapper())).toEqual(
      expect.arrayContaining(["relative", "h-full"]),
    );
    expect(classesOf(panel())).toContain("top-full");
  });
});

describe("LanguageSwitcher — the two placements", () => {
  it("leaves the bar's copy showing wherever the nav is collapsed", () => {
    const classes = classesOf(wrapper());
    expect(classes).toContain("lg:hidden");
    // `lg:hidden` alone hides it from `lg` up. A bare `hidden` next to it is
    // unconditional, and would take the only language control on the site
    // away at every width.
    expect(classes).not.toContain("hidden");
  });

  it("holds the nav's copy back to `lg`", async () => {
    await act(async () => root.unmount());
    render("nav");

    const classes = classesOf(wrapper());
    expect(classes).toContain("lg:flex");
    expect(classes).toContain("hidden");
    expect(classes).not.toContain("lg:hidden");
  });
});

describe("LanguageSwitcher — the open menu", () => {
  it("opens on a press and closes on the next one", async () => {
    await press(trigger());
    expect(isOpen()).toBe(true);
    expect(classesOf(panel())).toContain("block");

    await press(trigger());
    expect(isOpen()).toBe(false);
  });

  it("draws the storefront's menu", () => {
    // Square, 200px, a hairline with a gold top edge — the luxury restyle of
    // the design's grey, rounded 180px box.
    expect(classesOf(panel())).toEqual(
      expect.arrayContaining(["w-[200px]", "py-2", "border-line", "border-t-gold/60", "bg-paper"]),
    );
    expect(classesOf(panel())).not.toContain("rounded-[3px]");

    // The rows: 40px tall in small tracked capitals, each with the 2px left
    // rule that marks the one in use.
    for (const row of rows()) {
      expect(classesOf(row)).toEqual(
        expect.arrayContaining(["h-10", "pl-[18px]", "pr-4", "gap-2", "border-l-2", "text-[12px]", "uppercase"]),
      );
    }
  });

  it("lists every language in the order the design lists them", () => {
    expect(rows().map((row) => row.textContent)).toEqual([
      "English",
      "Deutsch",
      "Français",
      "Português",
      "Español",
    ]);
  });

  it("sends each language to its own path", () => {
    // This page in each language, not each language's home page: from
    // `/en/shop`, Deutsch is `/de/shop`. The five come out of the same
    // swap the address bar is on.
    expect(rows().map((row) => row.getAttribute("href"))).toEqual([
      "/en/shop",
      "/de/shop",
      "/fr/shop",
      "/pt/shop",
      "/es/shop",
    ]);
  });

  it("marks the language in use, and only that one", () => {
    const current = rows().find(
      (row) => row.getAttribute("aria-current") === "true",
    );
    expect(current).toBeDefined();

    // Marked three ways, so it never rests on colour alone: medium against
    // the others' regular, the ivory fill with its gold rule, and the check.
    expect(classesOf(current!)).toContain("font-medium");
    expect(classesOf(current!)).toContain("bg-ivory");
    expect(classesOf(current!)).toContain("border-gold");
    expect(current!.querySelector('img[src*="check"]')).not.toBeNull();

    const others = rows().filter((row) => row !== current);
    expect(others).toHaveLength(LANGUAGES.length - 1);
    for (const row of others) {
      expect(classesOf(row)).toContain("font-normal");
      expect(row.querySelector('img[src*="check"]')).toBeNull();
    }
  });

  it("closes when a language is chosen, so the menu never survives routing", async () => {
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
