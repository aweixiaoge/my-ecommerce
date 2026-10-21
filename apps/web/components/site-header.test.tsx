import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CurrencyTrigger } from "@/components/currency-switcher";
import { en } from "@/lib/i18n/messages/en";
import { localePath } from "@/lib/i18n/paths";
import { NAV } from "@/lib/nav";
import { SiteHeader } from "./site-header";

/*
 * jsdom never lays out the document, so the visibility of the two navs is
 * asserted from their classes — the exact strings Tailwind compiles into the
 * media queries that decide it in a browser.
 *
 * Plain DOM queries rather than a testing library: the assertions here are
 * about which element carries which attribute, and the harness would be a
 * dependency bought for nothing.
 */

/** `next/image` is mocked to its underlying element; `next/link` is left
 *  as-is, which is what makes the href assertions below meaningful. The mock
 *  stands in *for* next/image, so it cannot itself be next/image. */
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src?: unknown; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : "mock"} alt={alt ?? ""} />
  ),
}));

/** The language switcher, rendered inside the header, reads the address it is
 *  on to draw its rows. jsdom is not a Next render, so the pathname is handed
 *  to it — one with a language in it, which is what the swap works on. */
vi.mock("next/navigation", () => ({ usePathname: () => "/en/shop" }));

/** The seven routes, resolved the way `app/[lang]/layout.tsx` resolves them:
 *  the label from this locale's catalog and the address through `localePath`.
 *  `NAV` itself carries keys and paths without a language. */
const nav = NAV.map((item) => ({
  label: en.nav[item.key],
  href: localePath("en", item.href),
  prefetch: item.prefetch,
}));

type MediaChange = (event: { matches: boolean }) => void;

let mediaListeners: MediaChange[] = [];
let mediaStubs: { media: string; addEventListener: ReturnType<typeof vi.fn> }[] =
  [];

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (media: string) => {
      const stub = {
        media,
        onchange: null,
        matches: false,
        addEventListener: vi.fn((type: string, listener: MediaChange) => {
          if (type === "change") mediaListeners.push(listener);
        }),
        removeEventListener: vi.fn((type: string, listener: MediaChange) => {
          mediaListeners = mediaListeners.filter((entry) => entry !== listener);
        }),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
      mediaStubs.push(stub);
      return stub;
    },
  });
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  mediaListeners = [];
  mediaStubs = [];
  act(() => {
    root = createRoot(container);
    root.render(
      <SiteHeader
        nav={nav}
        messages={en.header}
        locale="en"
        // What the layout hands over: the currency control at rest. The live
        // one is a Server Component and cannot be rendered here — jsdom has no
        // cookie jar — so what this test can say about it is where it sits,
        // which is what the switcher assertions below are about.
        navCurrency={<CurrencyTrigger currency="USD" placement="nav" />}
        barCurrency={<CurrencyTrigger currency="USD" placement="bar" />}
      />,
    );
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const header = () => container.querySelector("header")!;

/** The header's row: the grid the logo, the nav and the actions share. */
const row = () => header().querySelector(".container-content")!;

/** The name the accessibility tree would announce for a link or button. */
const name = (element: Element) =>
  element.getAttribute("aria-label")?.trim() ||
  element.textContent?.trim() ||
  "";

const button = (scope: ParentNode, label: string) => {
  const found = scope.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  );
  if (!found) throw new Error(`no button named "${label}" is rendered`);
  return found;
};

/** The collapse toggle. Its label flips between "Open menu" and "Close menu"
 *  with the state, so either spelling addresses it — and it has to be the
 *  label: the language switcher's trigger is the header's other
 *  `aria-controls`/`aria-expanded` button, and the attribute pairing alone
 *  would find whichever of the two came first in the document. */
const toggle = () =>
  header().querySelector<HTMLButtonElement>(
    'button[aria-label="Open menu"], button[aria-label="Close menu"]',
  )!;

const panel = () =>
  container.querySelector<HTMLElement>(
    `#${CSS.escape(toggle().getAttribute("aria-controls")!)}`,
  )!;

const link = (scope: ParentNode, label: string) => {
  const found = [...scope.querySelectorAll<HTMLAnchorElement>("a")].find(
    (anchor) => name(anchor) === label,
  );
  if (!found) throw new Error(`no link named "${label}" is rendered`);
  return found;
};

/** Every link named `label`, in document order. The two switchers exist twice
 *  over — once in the desktop nav and once in the bar — so `link` alone, which
 *  stops at the first, cannot answer a question about either one. */
const links = (scope: ParentNode, label: string) =>
  [...scope.querySelectorAll<HTMLAnchorElement>("a")].filter(
    (anchor) => name(anchor) === label,
  );

/** Every button the accessibility tree would announce as `label`, in document
 *  order. Same reason as `links` below: the language switcher's trigger exists
 *  twice over, and only one of the two is ever displayed. */
const buttons = (scope: ParentNode, label: string) =>
  [...scope.querySelectorAll<HTMLButtonElement>("button")].filter(
    (element) => name(element) === label,
  );

/** The desktop nav, the first `navigation` in the header. */
const desktopNav = () => header().querySelectorAll("nav")[0];

/** The two copies of one switcher, as the element that carries each copy's
 *  placement — `lg:hidden` on the bar's, `lg:flex` on the nav's.
 *
 *  Both controls draw a copy as a trigger inside a wrapper, because both open
 *  a menu: the trigger is what carries the name, and the wrapper what carries
 *  the placement and anchors the menu, so the wrapper is what these assertions
 *  read. The language switcher is rendered here as itself; the currency control
 *  is the layout's fallback, `CurrencyTrigger`, whose trigger is a span rather
 *  than a button because a fallback opens nothing. */
const switcherCopies = (label: string) =>
  label === "EN"
    ? buttons(header(), "Language: EN").map((trigger) => trigger.parentElement!)
    : [...header().querySelectorAll<HTMLSpanElement>("span")]
        .filter((span) => name(span) === label)
        .map((span) => span.parentElement!);

/** The copy of a switcher that the nav collapsing does not take away: the one
 *  in the bar, which is the `lg:hidden` copy. */
const barSwitcher = (label: string) => {
  const found = switcherCopies(label).filter((element) =>
    element.className.split(/\s+/).includes("lg:hidden"),
  );
  if (found.length !== 1) {
    throw new Error(`expected one "${label}" switcher in the bar, got ${found.length}`);
  }
  return found[0];
};

const click = async (element: Element) => {
  await act(async () => {
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

const isExpanded = () => toggle().getAttribute("aria-expanded") === "true";

describe("SiteHeader — desktop nav", () => {
  it("renders every storefront route in the desktop nav", () => {
    expect(desktopNav().className.split(/\s+/)).toContain("bar:flex");
    for (const item of nav) {
      expect(link(desktopNav(), item.label).getAttribute("href")).toBe(
        item.href,
      );
    }
  });

  it("holds the design's spacing on the links only from `wide` up", () => {
    // `bar` is 768 because that is the narrowest a laptop window gets used
    // at — but the design's own 12.5px of link padding wants ~797px of
    // viewport, so at 768 the bar is short by it. The padding is where the
    // difference is found. Dropping `wide:px-[12.5px]` would leave the links
    // tight at every width; dropping `px-[8px]` would put the row back over
    // and collapse the nav at the width this breakpoint exists to serve.
    for (const item of nav) {
      const classes = link(desktopNav(), item.label).className.split(/\s+/);
      expect(classes).toContain("px-[8px]");
      expect(classes).toContain("wide:px-[12.5px]");
    }
  });

  it("pins the toggle to the sizes where the nav is collapsed", () => {
    const classes = toggle().className.split(/\s+/);
    // `bar:hidden` alone hides the toggle from `bar` up. A bare `hidden` next
    // to it would be unconditional, hiding the toggle at every size and
    // leaving the collapsed nav with no way in.
    expect(classes).toContain("bar:hidden");
    expect(classes).not.toContain("hidden");
  });

  it("takes the panel down at the same width the CSS calls `bar`", async () => {
    await click(toggle());
    // The classes above and this query are two spellings of one decision: the
    // utility compiles from `--breakpoint-bar` in globals.css, the query is
    // written out here. 768 appearing in both is the point — if they drift,
    // the panel is live at a width whose bar already shows the same links.
    expect(mediaStubs.some((stub) => stub.media === "(min-width: 768px)")).toBe(
      true,
    );
  });
});

describe("SiteHeader — menu below bar", () => {
  it("starts closed, hidden, and reporting itself as collapsed", () => {
    expect(toggle().getAttribute("aria-expanded")).toBe("false");

    // Hidden rather than unmounted, so opening costs nothing and the links
    // are never tabbable while the panel is closed (display:none removes
    // them from the accessibility tree).
    expect(panel().className.split(/\s+/)).toContain("hidden");
    expect(panel().className.split(/\s+/)).not.toContain("flex");
  });

  it("opens on a click and closes on the next one", async () => {
    await click(toggle());
    expect(isExpanded()).toBe(true);
    expect(panel().className.split(/\s+/)).toContain("flex");

    await click(button(header(), "Close menu"));
    expect(isExpanded()).toBe(false);
  });

  it("offers every nav route inside the panel", async () => {
    await click(toggle());

    for (const item of nav) {
      expect(link(panel(), item.label).getAttribute("href")).toBe(item.href);
    }
  });

  it("closes when a destination is chosen, so the panel never survives routing", async () => {
    await click(toggle());

    await click(link(panel(), "Shop"));

    expect(isExpanded()).toBe(false);
  });

  it("closes on Escape", async () => {
    await click(toggle());

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    expect(isExpanded()).toBe(false);
  });

  it("closes when the viewport becomes desktop-sized", async () => {
    await click(toggle());
    expect(mediaStubs.length).toBeGreaterThan(0);

    await act(async () => {
      for (const listener of mediaListeners) listener({ matches: true });
    });

    expect(isExpanded()).toBe(false);
  });
});

describe("SiteHeader — the row's columns", () => {
  it("drops to two columns where the nav is collapsed, so the actions keep the right edge", () => {
    // Below `bar` the nav is `display:none`, and a display:none element is not
    // a grid item at all. Held to the design's fixed three columns, the
    // actions would auto-place into the middle one and sit mid-bar with an
    // empty third of the row beside them.
    const classes = row().className.split(/\s+/);
    expect(classes).toContain("grid-cols-[1fr_auto]");
    expect(classes).toContain("bar:grid-cols-[1fr_auto_1fr]");
  });
});

describe("SiteHeader — what the 768 floor costs", () => {
  it("sheds the cart's amount between bar and wide", () => {
    const cart = header().querySelector<HTMLAnchorElement>('a[href="/en/cart"]')!;
    const amount = [...cart.querySelectorAll("span")].find(
      (span) => name(span) === "$0.00",
    )!;

    const classes = amount.className.split(/\s+/);
    // The 44px this buys is most of what 768 is short by. It is `wide`, not
    // `sm`: at `sm` the amount would be back on screen at 640, where the bar
    // is 190px short and the nav is behind a tap anyway.
    expect(classes).toContain("wide:inline");
    expect(classes).not.toContain("sm:inline");
    expect(classes).toContain("hidden");
  });
});

describe("SiteHeader — language and currency switchers", () => {
  it("keeps both switchers in the bar at the sizes where the nav is collapsed", () => {
    for (const label of ["EN", "USD"]) {
      const classes = barSwitcher(label).className.split(/\s+/);
      // `lg`, not `bar`: between `bar` and `lg` the nav is on screen but has
      // dropped its own pair, so this one has to stay up or the width band
      // would show no switcher at all.
      expect(classes).toContain("lg:hidden");
      expect(classes).not.toContain("bar:hidden");
      // The toggle's trap, one breakpoint over: a bare `hidden` alongside
      // `lg:hidden` is unconditional, and would take the only language and
      // currency controls on the site away at every width.
      expect(classes).not.toContain("hidden");
    }
  });

  it("leaves each switcher to exactly one of the two placements", () => {
    for (const label of ["EN", "USD"]) {
      // Two copies in the document — the bar's and the nav's — never three.
      expect(switcherCopies(label)).toHaveLength(2);

      const navCopy = switcherCopies(label).find((element) =>
        desktopNav().contains(element),
      )!;
      const classes = navCopy.className.split(/\s+/);
      expect(classes).not.toContain("lg:hidden");
      // The nav's copy is held back to `lg`: between `bar` and `lg` the nav is
      // on screen but too narrow for it, so the bar's pair is the one that
      // shows there. Without this the two pairs would both be displayed.
      expect(classes).toContain("lg:flex");
      expect(classes).toContain("hidden");
    }
  });

  it("keeps the switchers out of the panel, which opens over the bar", async () => {
    await click(toggle());

    for (const label of ["EN", "USD"]) {
      expect(links(panel(), label)).toHaveLength(0);
      // Neither control is repeated behind the tap: both are in the bar, which
      // stays on screen while this panel is open.
      expect(switcherCopies(label).filter((copy) => panel().contains(copy))).toHaveLength(0);
    }
  });
});

describe("SiteHeader — search", () => {
  it("renders no search control", () => {
    // Search was in the design and was dropped from the bar deliberately, so
    // its absence is asserted rather than left to the next reader's diff.
    expect(header().querySelector('button[aria-label="Search"]')).toBeNull();
    expect(container.querySelector('img[src*="search"]')).toBeNull();
  });
});
