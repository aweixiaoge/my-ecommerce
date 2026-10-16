import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IMAGES_PER_BLOG_MAX } from "@my-ecommerce/shared";
import { BlogForm } from "./blog-form";

/**
 * The create form, driven the way a person drives it.
 *
 * The server actions are mocked, and only they: everything under test is the
 * form's own behaviour — what it submits, how the image list answers to
 * picking, moving and removing, and what it shows when an action refuses. The
 * rules the payload has to satisfy are the shared schema's and are tested
 * against it directly. The harness mirrors `product-form.test.tsx`'s, because
 * the two forms answer to the same rules.
 */
const actions = vi.hoisted(() => ({
  createBlog: vi.fn(),
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

vi.mock("@/app/admin/(shell)/blogs/actions", () => ({
  createBlogAction: actions.createBlog,
}));

// One door for every form that stores an image: the blog form reaches the
// upload action through the same module the product form does, mocked at the
// same place.
vi.mock("@/app/admin/media/actions", () => ({
  uploadMediaAction: actions.uploadMedia,
}));

const CATEGORIES = [
  { id: "cat_1", name: "Engineer" },
  { id: "cat_2", name: "Design" },
];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  actions.createBlog.mockReset();
  actions.uploadMedia.mockReset();
  actions.uploadMedia.mockImplementation(async (file: File) => ({
    ok: true,
    media: { id: `media_${file.name}`, url: `/admin/media/media_${file.name}` },
  }));

  container = document.createElement("div");
  document.body.append(container);
  act(() => {
    root = createRoot(container);
    root.render(<BlogForm categories={CATEGORIES} />);
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

/** A file with the three fields the upload checks read. */
function file(name: string, type = "image/png"): File {
  return new File(["bytes"], name, { type });
}

function field<T extends HTMLElement>(selector: string): T {
  const found = container.querySelector<T>(selector);
  if (!found) throw new Error(`no element matches ${selector}`);
  return found;
}

const form = () => field("form");

const findByText = (selector: string, text: string) => {
  const found = [...container.querySelectorAll(selector)].find(
    (element) => element.textContent?.trim() === text,
  );
  if (!found) throw new Error(`no ${selector} reading "${text}" is rendered`);
  return found as HTMLElement;
};

const problemTexts = () =>
  [...container.querySelectorAll("li")].map((li) =>
    (li.textContent ?? "").trim(),
  );

/** The hidden field's ids, parsed the way the action parses them. */
const submittedMediaIds = () =>
  JSON.parse(
    field<HTMLInputElement>('input[name="mediaIds"]').value,
  ) as string[];

/**
 * Submits the way a browser does.
 *
 * jsdom has no implicit submission, so clicking the button never reaches
 * React's action — the submit event is what does.
 */
async function submit() {
  await act(async () => {
    form().dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
}

/** Clicks an element the way a browser does. */
async function click(element: HTMLElement) {
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  });
}

/**
 * Types into a controlled input the way a browser does.
 *
 * Assigning `.value` directly goes through React's own setter, which swallows
 * the change; the native setter plus an `input` event is what React listens to.
 */
async function typeInto(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(element),
      "value",
    )!.set!;
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Picks an option the way a browser does. */
async function choose(select: HTMLSelectElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(select),
      "value",
    )!.set!;
    setter.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

/**
 * Chooses files on the image input, and lets the uploads they start settle.
 *
 * The change handler fires the uploads without awaiting them, so one extra
 * flush is what lets their results land in state before the assertions.
 */
async function pickFiles(files: File[]) {
  const input = field<HTMLInputElement>("#images");

  await act(async () => {
    Object.defineProperty(input, "files", {
      value: files,
      configurable: true,
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(async () => {});
}

/** A promise the test resolves by hand, to observe the form mid-flight. */
function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("BlogForm", () => {
  it("submits the typed fields, with no images to begin with", async () => {
    await typeInto(field("#title"), "How to judge earphone sound quality");
    await typeInto(field("#shortDescription"), "Bass, treble and soundstage.");
    await typeInto(field("#description"), "## The basics");
    await choose(field("#categoryId"), "cat_1");
    await submit();

    const [, formData] = actions.createBlog.mock.calls[0] as [
      unknown,
      FormData,
    ];
    expect(formData.get("title")).toBe("How to judge earphone sound quality");
    expect(formData.get("shortDescription")).toBe(
      "Bass, treble and soundstage.",
    );
    expect(formData.get("description")).toBe("## The basics");
    expect(formData.get("categoryId")).toBe("cat_1");
    expect(formData.get("mediaIds")).toBe("[]");
  });

  it("submits the ids the uploads returned, in the order the files were chosen", async () => {
    await pickFiles([file("a.png"), file("b.png")]);

    expect(submittedMediaIds()).toEqual(["media_a.png", "media_b.png"]);
    // The thumbnails are the same list: what is submitted is what is on screen.
    expect(
      [...container.querySelectorAll("img")].map((img) =>
        img.getAttribute("src"),
      ),
    ).toEqual(["/admin/media/media_a.png", "/admin/media/media_b.png"]);
  });

  it("marks the first image as the Main one", async () => {
    await pickFiles([file("a.png"), file("b.png")]);

    const main = container.querySelectorAll("span");
    const labels = [...main].map((span) => span.textContent);
    expect(labels.filter((label) => label === "Main")).toHaveLength(1);

    // And it follows the order: moving the second image earlier makes it Main.
    await click(
      field<HTMLButtonElement>('[aria-label="Move image 2 earlier"]'),
    );

    expect(submittedMediaIds()).toEqual(["media_b.png", "media_a.png"]);

    // The pair of arrows is symmetric, and moving back is what says so — the
    // first image is the one that travelled.
    await click(
      field<HTMLButtonElement>('[aria-label="Move image 1 later"]'),
    );

    expect(submittedMediaIds()).toEqual(["media_a.png", "media_b.png"]);
  });

  it("removes an image wherever it is in the order", async () => {
    await pickFiles([file("a.png"), file("b.png")]);

    await click(field('[aria-label="Remove image 1"]'));

    expect(submittedMediaIds()).toEqual(["media_b.png"]);
  });

  it("refuses a file the browser checks refuse, without uploading it", async () => {
    // Feedback, not enforcement — the action checks again — but a PDF should
    // cost the person a sentence, not a request.
    await pickFiles([file("notes.txt", "text/plain")]);

    expect(actions.uploadMedia).not.toHaveBeenCalled();
    expect(problemTexts().some((text) => text.includes("notes.txt"))).toBe(
      true,
    );
  });

  it("shows the message when the upload action refuses a file", async () => {
    actions.uploadMedia.mockResolvedValue({
      ok: false,
      message: "That file is too large.",
    });

    await pickFiles([file("huge.png")]);

    expect(container.textContent).toContain("That file is too large.");
    expect(submittedMediaIds()).toEqual([]);
  });

  it("shows something when an upload never comes back", async () => {
    // A dev server that restarted mid-upload. The alternative is sitting on
    // "Uploading 1…" for the rest of the session.
    actions.uploadMedia.mockRejectedValue(new Error("dropped"));

    await pickFiles([file("a.png")]);

    expect(container.textContent).toContain(
      "That upload did not finish. Try again.",
    );
  });

  it("counts uploads still in flight against the cap", async () => {
    // The ids an in-flight upload will bring back are already spoken for;
    // counting only what has arrived lets a second selection pass the limit,
    // and the refusal then lands on the submit button rather than on the file
    // that was one too many.
    const inFlight = deferred();
    actions.uploadMedia.mockReturnValue(inFlight.promise);

    await pickFiles([file("a.png"), file("b.png"), file("c.png")]);
    await pickFiles([
      file("d.png"),
      file("e.png"),
      file("f.png"),
      file("g.png"),
    ]);

    expect(problemTexts()).toContain(
      `1 image was not uploaded — a blog post holds at most ${IMAGES_PER_BLOG_MAX}.`,
    );
    // One request per selection: the uploads run in sequence, so each selection
    // has only its first file on the wire while its three slots are spoken for.
    expect(actions.uploadMedia).toHaveBeenCalledTimes(2);
  });

  it("stops offering images once the list is full", async () => {
    await pickFiles(
      Array.from({ length: IMAGES_PER_BLOG_MAX }, (_, index) =>
        file(`photo-${index}.png`),
      ),
    );

    expect(field<HTMLInputElement>("#images").disabled).toBe(true);
    expect(container.textContent).toContain(
      `${IMAGES_PER_BLOG_MAX} images is the limit`,
    );
  });

  it("does not submit while an image is uploading", async () => {
    // The hidden field is built from state, so submitting mid-upload would
    // save the post without the ids that had not arrived yet.
    const inFlight = deferred();
    actions.uploadMedia.mockReturnValue(inFlight.promise);

    await pickFiles([file("a.png")]);

    expect(
      (findByText("button", "Create blog") as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(container.textContent).toContain(
      "Waiting for the images to finish uploading.",
    );

    await act(async () =>
      inFlight.resolve({
        ok: true,
        media: { id: "media_a.png", url: "/admin/media/media_a.png" },
      }),
    );

    expect(
      (findByText("button", "Create blog") as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("renders the field errors the action returned, and keeps what was typed", async () => {
    // React 19 resets a form when its action resolves. An uncontrolled field
    // would come back empty — and, being `required`, would then refuse the next
    // submit without firing it.
    actions.createBlog.mockResolvedValue({
      errors: { title: ["Title is too long."] },
    });

    await typeInto(field("#title"), "A very long title");
    await submit();

    expect(findByText("li", "Title is too long.")).toBeTruthy();
    expect(field("#title").getAttribute("aria-describedby")).toBe(
      "title-error",
    );
    expect(field<HTMLInputElement>("#title").value).toBe("A very long title");
  });

  it("renders a category the action refused beside the dropdown", async () => {
    // A category deleted in another tab: the sentence belongs next to the field
    // the person has to answer again, not in a banner at the top.
    actions.createBlog.mockResolvedValue({
      errors: {
        categoryId: ["That category no longer exists. Choose another."],
      },
    });

    await submit();

    expect(
      findByText("li", "That category no longer exists. Choose another."),
    ).toBeTruthy();
    expect(field("#categoryId").getAttribute("aria-describedby")).toBe(
      "category-id-error",
    );
  });

  it("renders the banner message the action returned", async () => {
    actions.createBlog.mockResolvedValue({
      message: "The post could not be saved.",
    });

    await submit();

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "The post could not be saved.",
    );
  });

  it("says it is creating while the action is in flight", async () => {
    // Two submissions of one post is two posts, so the button has to stop
    // taking clicks until the first answer arrives.
    const inFlight = deferred();
    actions.createBlog.mockReturnValue(inFlight.promise);

    await submit();

    expect(
      (findByText("button", "Creating…") as HTMLButtonElement).disabled,
    ).toBe(true);

    await act(async () => inFlight.resolve({ errors: { title: ["Enter a title."] } }));

    expect(findByText("button", "Create blog")).toBeTruthy();
  });

  it("points at the category screen, and refuses to submit, when there are none", async () => {
    // A required dropdown with nothing to pick is a dead end, so it says why
    // instead of leaving the browser to answer "please select an item".
    await act(async () => root.render(<BlogForm categories={[]} />));

    expect(
      (findByText("button", "Create blog") as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      field<HTMLAnchorElement>('a[href="/admin/blog-categories/new"]')
        .textContent,
    ).toBe("Create one");
  });
});
