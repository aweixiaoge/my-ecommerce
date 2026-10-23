import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AboutForm } from "./about-form";

/**
 * The About screen's form, driven the way a person drives it. The actions are
 * mocked, and only they; the image picker's own rules are covered through the
 * blog form, which shares it.
 */
const actions = vi.hoisted(() => ({ save: vi.fn(), uploadMedia: vi.fn() }));

// See `blog-form.test.tsx`: this file drives React deliberately.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/app/admin/(shell)/contact-about/actions", () => ({ saveAboutAction: actions.save }));
vi.mock("@/lib/admin/upload-media", () => ({ uploadMedia: actions.uploadMedia }));

let container: HTMLDivElement;
let root: Root;

function mount(props: { description?: string; mediaIds?: string[] } = {}) {
  container = document.createElement("div");
  document.body.append(container);
  act(() => {
    root = createRoot(container);
    root.render(<AboutForm description={props.description ?? ""} mediaIds={props.mediaIds ?? []} />);
  });
}

beforeEach(() => {
  actions.save.mockReset().mockResolvedValue({ translated: "ok" });
  actions.uploadMedia.mockReset().mockImplementation(async (file: File) => ({
    ok: true,
    media: { id: `media_${file.name}`, url: `/admin/media/media_${file.name}` },
  }));
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const hiddenIds = () =>
  JSON.parse(container.querySelector<HTMLInputElement>('input[name="mediaIds"]')!.value);
const saveButton = () => container.querySelector<HTMLButtonElement>('button[type="submit"]')!;

async function pickFiles(files: File[]) {
  const input = container.querySelector<HTMLInputElement>("#images")!;
  await act(async () => {
    Object.defineProperty(input, "files", { value: files, configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(async () => {});
}

async function submit() {
  await act(async () => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

describe("AboutForm", () => {
  it("starts from what is saved: the images in order, the first marked Main, and the text", () => {
    mount({ description: "## Who we are", mediaIds: ["img_1", "img_2"] });

    expect(hiddenIds()).toEqual(["img_1", "img_2"]);
    expect([...container.querySelectorAll("img")].map((img) => img.getAttribute("src"))).toEqual([
      "/admin/media/img_1",
      "/admin/media/img_2",
    ]);
    expect(container.querySelector("li")?.textContent).toContain("Main");
    expect(container.querySelector("textarea")?.value).toBe("## Who we are");
  });

  it("sends the description and the images, a new upload appended", async () => {
    mount({ description: "## Who we are", mediaIds: ["img_1"] });

    await pickFiles([new File(["bytes"], "team.png", { type: "image/png" })]);
    await submit();

    const data = actions.save.mock.calls[0]?.[1] as FormData;
    expect(data.get("description")).toBe("## Who we are");
    expect(JSON.parse(data.get("mediaIds") as string)).toEqual(["img_1", "media_team.png"]);
  });

  it("holds Save while an image is still uploading", async () => {
    let finish!: (value: unknown) => void;
    actions.uploadMedia.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    mount();

    await pickFiles([new File(["bytes"], "team.png", { type: "image/png" })]);

    expect(saveButton().disabled).toBe(true);
    expect(container.textContent).toContain("Waiting for the images to finish uploading.");

    await act(async () => finish({ ok: true, media: { id: "media_team", url: "/admin/media/media_team" } }));
    expect(saveButton().disabled).toBe(false);
  });

  it("says what the translation pass did once saved, and drops it after a change", async () => {
    mount({ mediaIds: ["img_1"] });

    await submit();
    expect(container.querySelector('[role="status"]')?.textContent).not.toBe("");

    const remove = container.querySelector<HTMLButtonElement>('button[aria-label="Remove image 1"]')!;
    await act(async () => remove.click());
    expect(container.querySelector('[role="status"]')?.textContent).toBe("");
  });
});
