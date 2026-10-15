import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ProductForm } from "./product-form";

/**
 * The create form, driven the way a person drives it.
 *
 * The server actions are mocked, and only they: everything under test is the
 * form's own behaviour — which fields a colour gets, what the hidden payload
 * ends up holding, and what it refuses to submit. The rules those payloads have
 * to satisfy are the shared schema's and are tested against it directly.
 */
const actions = vi.hoisted(() => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  uploadMedia: vi.fn(),
}));

/**
 * Tells React this file drives it deliberately.
 *
 * Without it React logs "the current testing environment is not configured to
 * support act" for every update that lands while an action is in flight — which
 * is all of them here, because uploading an image is one.
 */
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/app/admin/(shell)/products/actions", () => ({
  createProductAction: actions.createProduct,
  updateProductAction: actions.updateProduct,
  uploadProductMediaAction: actions.uploadMedia,
}));

let container: HTMLDivElement;
let root: Root;

/** The product the edit tests open on. */
const saved = {
  id: "prod_1",
  status: "draft" as const,
  updatedAt: "2026-10-15T08:00:00.000Z",
  name: "Studio Over-Ear",
  shortDescription: "Closed-back.",
  description: "## Materials",
  slug: "studio-over-ear",
  attributes: [
    {
      id: "opt_1",
      kind: "color" as const,
      values: [
        { id: "val_1", name: "Black", variants: 1 },
        { id: "val_2", name: "Sand", variants: 0 },
      ],
    },
  ],
  variants: [
    {
      color: "Black",
      sku: "STUDIO-BLK",
      price: "79.00",
      stock: "12",
      mediaIds: ["media_old"],
    },
  ],
};

beforeEach(() => {
  actions.createProduct.mockReset();
  actions.updateProduct.mockReset();
  actions.uploadMedia.mockReset();
  actions.uploadMedia.mockImplementation(async (file: File) => ({
    ok: true,
    media: { id: `media_${file.name}`, url: `/admin/media/media_${file.name}` },
  }));

  container = document.createElement("div");
  document.body.append(container);
  act(() => {
    root = createRoot(container);
    root.render(<ProductForm />);
  });
});

/** Replaces the create form with the edit one — the same component, given a product. */
async function renderEditing() {
  await act(async () => root.unmount());
  container.remove();

  container = document.createElement("div");
  document.body.append(container);
  act(() => {
    root = createRoot(container);
    root.render(<ProductForm product={saved} />);
  });
}

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const form = () => container.querySelector("form")!;

/** The field the form assembles rather than the browser. */
const variantsJson = () =>
  JSON.parse(
    form().querySelector<HTMLInputElement>('input[name="variants"]')!.value,
  );

const findByText = (selector: string, text: string) => {
  const found = [...container.querySelectorAll(selector)].find(
    (element) => element.textContent?.trim() === text,
  );
  if (!found) throw new Error(`no ${selector} reading "${text}" is rendered`);
  return found as HTMLElement;
};

const click = async (element: Element) => {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

/**
 * Types into a controlled input the way a browser does.
 *
 * Assigning `.value` directly goes through React's own setter, which swallows
 * the change; the native setter plus an `input` event is what React listens to.
 */
const typeInto = async (
  field: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) => {
  await act(async () => {
    // The setter from the element's own prototype: a textarea's is not the
    // input's, and calling the wrong one throws rather than typing.
    const setter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(field),
      "value",
    )!.set!;
    setter.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

/** Adds the colour attribute and fills its values box. */
async function addColors(values: string) {
  await click(findByText("button", "Add attribute"));
  await typeInto(
    container.querySelector<HTMLInputElement>("#attribute-0-values")!,
    values,
  );
}

const colorField = (color: string, field: string) =>
  container.querySelector<HTMLInputElement>(`#${color}-${field}`)!;

/** Chooses files through a colour's file input. */
async function pickFiles(color: string, files: File[]) {
  const input = container.querySelector<HTMLInputElement>(`#${color}-images`)!;

  await act(async () => {
    // jsdom has no DataTransfer and no way to set a file input's selection, so
    // the property the change handler reads is defined directly.
    Object.defineProperty(input, "files", { value: files, configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

const image = (name: string) =>
  new File(["fake bytes"], name, { type: "image/png" });

const legends = () =>
  [...container.querySelectorAll("legend")].map((l) => l.textContent);

describe("ProductForm — colour rows", () => {
  it("gives each colour its own price, stock, SKU and images", async () => {
    await addColors("Black, Sand");

    expect(legends()).toEqual(["Black", "Sand"]);
    expect(colorField("black", "price")).toBeTruthy();
    expect(colorField("sand", "sku")).toBeTruthy();
    expect(container.querySelector("#black-images")).toBeTruthy();
  });

  it("keeps a colour's row while the box above it is edited", async () => {
    // The values box is comma-separated, so a row must survive every keystroke
    // of the list it belongs to.
    await addColors("Black, Sand");
    await typeInto(colorField("sand", "sku"), "SAND-1");
    await typeInto(
      container.querySelector<HTMLInputElement>("#attribute-0-values")!,
      "Black, Sand, Clay",
    );

    expect(legends()).toEqual(["Black", "Sand", "Clay"]);
    expect(colorField("sand", "sku").value).toBe("SAND-1");
  });

  it("stops submitting a colour that was deleted from the box", async () => {
    await addColors("Black, Sand");
    await typeInto(colorField("black", "sku"), "STUDIO-BLK");

    await typeInto(
      container.querySelector<HTMLInputElement>("#attribute-0-values")!,
      "Sand",
    );

    expect(variantsJson()).toEqual([]);
  });

  it("submits what a colour's row says", async () => {
    await addColors("Black");
    await typeInto(colorField("black", "price"), "79.00");
    await typeInto(colorField("black", "stock"), "12");
    await typeInto(colorField("black", "sku"), "STUDIO-BLK");

    expect(variantsJson()).toEqual([
      {
        color: "Black",
        price: { amount: "79.00", currency: "USD" },
        stock: 12,
        sku: "STUDIO-BLK",
        mediaIds: [],
      },
    ]);
  });

  it("leaves out a colour nobody has filled in", async () => {
    await addColors("Black, Sand");

    expect(variantsJson()).toEqual([]);
  });
});

describe("ProductForm — colour images", () => {
  it("uploads the files that were chosen and hangs onto the ids", async () => {
    await addColors("Black");
    await pickFiles("black", [image("a.png"), image("b.png")]);

    expect(actions.uploadMedia).toHaveBeenCalledTimes(2);
    expect(variantsJson()).toEqual([
      { color: "Black", mediaIds: ["media_a.png", "media_b.png"] },
    ]);
  });

  it("shows each image from the URL the id resolves to", async () => {
    // Not a blob URL held in the page: that is what would stop working after a
    // reload, and the reason the bytes are served by a route at all.
    await addColors("Black");
    await pickFiles("black", [image("a.png")]);

    const thumbnail = container.querySelector<HTMLImageElement>("img");
    expect(thumbnail?.getAttribute("src")).toBe("/admin/media/media_a.png");
  });

  it("does not name the file input", async () => {
    // A named one makes React copy the raw Files into the submitted form as
    // well as the ids, which is the payload this shape exists to avoid.
    await addColors("Black");

    expect(container.querySelector("#black-images")!.getAttribute("name")).toBeNull();
  });

  it("keeps the order the files were chosen in", async () => {
    await addColors("Black");
    await pickFiles("black", [image("a.png"), image("b.png")]);

    expect(
      (variantsJson()[0] as { mediaIds: string[] }).mediaIds,
    ).toEqual(["media_a.png", "media_b.png"]);
  });

  it("moves an image earlier and later", async () => {
    await addColors("Black");
    await pickFiles("black", [image("a.png"), image("b.png")]);

    // The buttons are labelled by position, so the second image moving earlier
    // becomes the first one — and the button that undoes it is the first
    // image's "later", not the second's.
    await click(
      container.querySelector('[aria-label="Move Black image 2 earlier"]')!,
    );
    expect(
      (variantsJson()[0] as { mediaIds: string[] }).mediaIds,
    ).toEqual(["media_b.png", "media_a.png"]);

    await click(
      container.querySelector('[aria-label="Move Black image 1 later"]')!,
    );
    expect(
      (variantsJson()[0] as { mediaIds: string[] }).mediaIds,
    ).toEqual(["media_a.png", "media_b.png"]);
  });

  it("cannot move the first image earlier or the last one later", async () => {
    await addColors("Black");
    await pickFiles("black", [image("a.png"), image("b.png")]);

    expect(
      container
        .querySelector('[aria-label="Move Black image 1 earlier"]')!
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      container
        .querySelector('[aria-label="Move Black image 2 later"]')!
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("marks the first image as the main one", async () => {
    await addColors("Black");
    await pickFiles("black", [image("a.png"), image("b.png")]);

    expect(container.textContent).toContain("Main");
  });

  it("removes an image", async () => {
    await addColors("Black");
    await pickFiles("black", [image("a.png"), image("b.png")]);

    await click(container.querySelector('[aria-label="Remove Black image 1"]')!);

    expect(
      (variantsJson()[0] as { mediaIds: string[] }).mediaIds,
    ).toEqual(["media_b.png"]);
  });

  it("says so when the upload is refused, and keeps the row working", async () => {
    actions.uploadMedia.mockResolvedValueOnce({
      ok: false,
      message: "a.png is not an image we can store.",
    });

    await addColors("Black");
    await pickFiles("black", [image("a.png")]);

    expect(container.textContent).toContain("is not an image we can store");
    expect(variantsJson()).toEqual([]);
  });

  it("refuses more images than a colour holds without asking the server", async () => {
    // Six is the schema's cap; spending six requests to be told so would be
    // worse than saying it here.
    await addColors("Black");
    await pickFiles(
      "black",
      Array.from({ length: 7 }, (_, i) => image(`a${i}.png`)),
    );

    expect(actions.uploadMedia).toHaveBeenCalledTimes(6);
    expect(container.textContent).toContain("1 image was not uploaded");
  });

  it("counts an image that is still uploading against the cap", async () => {
    // The id has not arrived, but the slot is spoken for. Counting only what
    // has landed lets a second selection take the row over the limit, and the
    // refusal then lands on the submit button rather than on the file that was
    // one too many.
    let release: (result: unknown) => void = () => {};
    actions.uploadMedia.mockImplementationOnce(
      () => new Promise((resolve) => { release = resolve; }),
    );

    await addColors("Black");
    await pickFiles("black", [image("a.png")]);

    await pickFiles(
      "black",
      Array.from({ length: 6 }, (_, i) => image(`b${i}.png`)),
    );

    // One in flight plus five that fit: the sixth is refused rather than queued.
    expect(actions.uploadMedia).toHaveBeenCalledTimes(6);
    expect(container.textContent).toContain("1 image was not uploaded");

    await act(async () => {
      release({ ok: true, media: { id: "media_a.png", url: "/admin/media/media_a.png" } });
    });
  });

  it("will not submit while an image is still on its way", async () => {
    // The payload is built from state, so submitting mid-upload would save the
    // product with the ids that had arrived and change the page before anyone
    // could notice the rest were missing.
    actions.uploadMedia.mockImplementationOnce(() => new Promise(() => {}));

    await addColors("Black");
    await pickFiles("black", [image("a.png")]);

    expect(
      findByText("button", "Create product").hasAttribute("disabled"),
    ).toBe(true);
    expect(container.textContent).toContain(
      "Waiting for the images to finish uploading.",
    );
  });

  it("says so when an upload never comes back", async () => {
    // The action returns its refusals as messages, so this is the rare path —
    // but a dropped request must not leave the row saying "Uploading…" for the
    // rest of the session with no way to clear it.
    actions.uploadMedia.mockRejectedValueOnce(new Error("dropped"));

    await addColors("Black");
    await pickFiles("black", [image("a.png")]);

    expect(container.textContent).toContain("That upload did not finish");
    expect(
      findByText("button", "Create product").hasAttribute("disabled"),
    ).toBe(false);
  });
});

describe("ProductForm — problems", () => {
  it("says what is wrong with a price and refuses to submit it", async () => {
    await addColors("Black");
    await typeInto(colorField("black", "price"), "abc");

    expect(container.textContent).toContain("Enter a price such as 79.00.");
    expect(
      findByText("button", "Create product").hasAttribute("disabled"),
    ).toBe(true);
  });

  it("says what is wrong with a stock figure", async () => {
    await addColors("Black");
    await typeInto(colorField("black", "stock"), "1.5");

    expect(container.textContent).toContain("Enter a whole number of units.");
  });

  it("submits again once the mistake is corrected", async () => {
    await addColors("Black");
    await typeInto(colorField("black", "price"), "abc");
    await typeInto(colorField("black", "price"), "79.00");

    expect(findByText("button", "Create product").hasAttribute("disabled")).toBe(
      false,
    );
    expect(variantsJson()).toEqual([
      {
        color: "Black",
        price: { amount: "79.00", currency: "USD" },
        mediaIds: [],
      },
    ]);
  });

  it("does not hold the form up over a colour that was deleted", async () => {
    await addColors("Black, Sand");
    await typeInto(colorField("black", "price"), "abc");

    await typeInto(
      container.querySelector<HTMLInputElement>("#attribute-0-values")!,
      "Sand",
    );

    expect(findByText("button", "Create product").hasAttribute("disabled")).toBe(
      false,
    );
  });
});

describe("ProductForm — attributes", () => {
  it("hints at what an attribute is for before one is added", () => {
    expect(container.textContent).toContain("a variant is built from");
  });

  it("keeps a size a plain list of values rather than a set of rows", async () => {
    // Only a colour has photographs and a price. A size that grew a price row
    // would be offering a second place to say what the colour already said.
    await click(findByText("button", "Add attribute"));

    await act(async () => {
      const select = container.querySelector<HTMLSelectElement>(
        'select[aria-label="Attribute 1 kind"]',
      )!;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value",
      )!.set!;
      setter.call(select, "size");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(legends()).toEqual([]);
    expect(container.textContent).toContain("Separate values with commas");

    await typeInto(
      container.querySelector<HTMLInputElement>("#attribute-0-values")!,
      "S, M, L",
    );

    // Scoped to the chips, which the row's own list item would otherwise be
    // caught alongside.
    expect(
      [...container.querySelectorAll("ul.flex-wrap > li")].map(
        (li) => li.textContent,
      ),
    ).toEqual(["S", "M", "L"]);
  });

  it("removes an attribute and forgets its rows", async () => {
    await addColors("Black");
    await click(colorField("black", "sku").ownerDocument.querySelector(
      '[aria-label="Remove Color attribute"]',
    )!);

    expect(legends()).toEqual([]);
    expect(variantsJson()).toEqual([]);
  });
});

describe("ProductForm — description", () => {
  it("edits the description and previews it from the same state", async () => {
    await typeInto(
      container.querySelector<HTMLTextAreaElement>("#description")!,
      "## Materials",
    );

    await click(findByText("button", "Preview"));

    expect(container.textContent).toContain("Materials");
    expect(container.querySelector("#description")).toBeNull();
  });

  it("submits the description from the preview tab too", async () => {
    // The textarea is unmounted there, so the value travels in a hidden field
    // instead — otherwise submitting from the preview saves no copy at all.
    await typeInto(
      container.querySelector<HTMLTextAreaElement>("#description")!,
      "## Materials",
    );
    await click(findByText("button", "Preview"));

    const hidden = container.querySelector<HTMLInputElement>(
      'input[name="description"]',
    );
    expect(hidden?.value).toBe("## Materials");
  });

  it("moves between the tabs with the arrow keys", async () => {
    // Dispatched at whichever tab is focused, as a browser would: the handler
    // reads its own position, so a key sent to the wrong tab would compute the
    // wrong neighbour.
    const key = async (name: string) => {
      const focused =
        document.activeElement?.getAttribute("role") === "tab"
          ? (document.activeElement as HTMLElement)
          : container.querySelector<HTMLElement>("#description-tab-write")!;

      await act(async () => {
        focused.dispatchEvent(
          new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }),
        );
      });
    };

    await key("ArrowRight");
    expect(
      container.querySelector("#description-tab-preview")!.getAttribute(
        "aria-selected",
      ),
    ).toBe("true");

    await key("ArrowLeft");
    expect(
      container.querySelector("#description-tab-write")!.getAttribute(
        "aria-selected",
      ),
    ).toBe("true");

    await key("End");
    expect(
      container.querySelector("#description-tab-preview")!.getAttribute(
        "aria-selected",
      ),
    ).toBe("true");

    await key("Home");
    expect(
      container.querySelector("#description-tab-write")!.getAttribute(
        "aria-selected",
      ),
    ).toBe("true");
  });

  it("leaves the tab alone for a key that means nothing here", async () => {
    await act(async () => {
      container
        .querySelector("#description-tab-write")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    });

    expect(
      container.querySelector("#description-tab-write")!.getAttribute(
        "aria-selected",
      ),
    ).toBe("true");
  });
});

describe("ProductForm — what the server says back", () => {
  /**
   * Submits the form.
   *
   * A `submit` event, not a click on the button: jsdom does not implement the
   * implicit submission a button press performs in a browser, so a click there
   * never reaches React's action. The event is what the action is really
   * attached to, so this drives the same path.
   */
  async function submit() {
    await act(async () => {
      form().dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
  }

  it("shows what the action refused, next to nothing in particular", async () => {
    // The variants payload has no single field to describe — a price and a SKU
    // and an image list all live in it — so the message announces itself.
    actions.createProduct.mockResolvedValue({
      errors: { variants: ["Black has more than one price and stock row."] },
    });

    await submit();

    expect(container.textContent).toContain(
      "Black has more than one price and stock row.",
    );
  });

  it("shows a failure that belongs to no field", async () => {
    actions.createProduct.mockResolvedValue({ message: "The store refused it." });

    await submit();

    const alert = container.querySelector('[role="alert"][aria-live="polite"]');
    expect(alert?.textContent).toBe("The store refused it.");
  });

  it("keeps what was typed when the submission is refused", async () => {
    // React resets a form when its action resolves, so anything the DOM is
    // holding comes back empty. On a `required` field that is worse than
    // annoying: the browser then blocks the next submit without firing one and
    // the button reads as broken.
    actions.createProduct.mockResolvedValue({
      errors: { variants: ["Something is wrong."] },
    });

    await typeInto(container.querySelector("#name")!, "Studio Over-Ear");
    await addColors("Black");
    await typeInto(colorField("black", "sku"), "STUDIO-BLK");
    await submit();

    expect(
      (container.querySelector("#name") as HTMLInputElement).value,
    ).toBe("Studio Over-Ear");
    expect(colorField("black", "sku").value).toBe("STUDIO-BLK");
  });
});

describe("ProductForm — editing", () => {
  it("opens on the product, in the same fields the create form has", async () => {
    // The same component and the same layout: a second screen with its own
    // would be a second screen to keep in step.
    await renderEditing();

    expect(container.querySelector<HTMLInputElement>("#name")!.value).toBe(
      "Studio Over-Ear",
    );
    expect(
      container.querySelector<HTMLInputElement>("#shortDescription")!.value,
    ).toBe("Closed-back.");
    expect(container.querySelector<HTMLTextAreaElement>("#description")!.value).toBe(
      "## Materials",
    );
  });

  it("shows the colours, their figures and their images", async () => {
    await renderEditing();

    expect(
      container.querySelector<HTMLInputElement>("#attribute-0-values")!.value,
    ).toBe("Black, Sand");
    expect(colorField("black", "price").value).toBe("79.00");
    expect(colorField("black", "stock").value).toBe("12");
    expect(colorField("black", "sku").value).toBe("STUDIO-BLK");
    expect(container.querySelector<HTMLImageElement>("#black-images ~ * img, fieldset img")?.getAttribute("src"))
      .toBe("/admin/media/media_old");
  });

  it("posts to the update action, with the id of the row to write over", async () => {
    await renderEditing();

    await act(async () => {
      form().dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    const [, formData] = actions.updateProduct.mock.calls[0] as [unknown, FormData];

    expect(actions.createProduct).not.toHaveBeenCalled();
    expect(formData.get("id")).toBe("prod_1");
    expect(formData.get("name")).toBe("Studio Over-Ear");
  });

  it("says Save rather than Create", async () => {
    await renderEditing();

    expect(
      [...container.querySelectorAll("button")].map((b) => b.textContent),
    ).toContain("Save changes");
  });

  it("keeps a loaded colour's row when the values box is edited", async () => {
    // The row is keyed the way the form keys it — trimmed and lowercased — so
    // adding a colour does not disturb the one already there.
    await renderEditing();

    await typeInto(
      container.querySelector<HTMLInputElement>("#attribute-0-values")!,
      "Black, Sand, Clay",
    );

    expect(legends()).toEqual(["Black", "Sand", "Clay"]);
    expect(colorField("black", "price").value).toBe("79.00");
  });

  it("sends a variant row for a colour the database already has, even emptied", async () => {
    // Otherwise clearing a price and saving would store nothing and leave the
    // old price standing — a button that appears to work and does not.
    await renderEditing();

    await typeInto(colorField("black", "price"), "");

    expect(variantsJson()).toEqual([
      {
        color: "Black",
        sku: "STUDIO-BLK",
        stock: 12,
        mediaIds: ["media_old"],
      },
    ]);
  });

  it("does not send a row for a colour nobody has filled in", async () => {
    // The create form's rule, and it has to survive editing: a typed colour is
    // a colour, not an empty variant.
    await renderEditing();

    expect(variantsJson()).toHaveLength(1);
    expect(
      (variantsJson() as { color: string }[]).map((v) => v.color),
    ).toEqual(["Black"]);
  });
});
