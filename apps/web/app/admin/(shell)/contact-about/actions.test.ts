import { ABOUT_DESCRIPTION_MAX, IMAGES_PER_ABOUT_MAX } from "@my-ecommerce/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveAboutAction } from "./actions";

/**
 * The About screen's action, with the session, the repository and the
 * translation pass stood in for. What is left is what it reads from the form,
 * what it refuses, the order of save and translate, and what each outcome
 * reports.
 */
const deps = vi.hoisted(() => ({
  getSession: vi.fn(),
  saveAbout: vi.fn(),
  translateAbout: vi.fn(),
}));

vi.mock("@my-ecommerce/db", () => ({ prisma: {} }));
vi.mock("@/lib/admin/session", () => ({ getSession: deps.getSession }));
vi.mock("@/lib/admin/translations", () => ({ translateAbout: deps.translateAbout }));
vi.mock("@/lib/contact/about-repo", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/contact/about-repo")>("@/lib/contact/about-repo");
  return { ...actual, saveAbout: deps.saveAbout };
});

const { UnknownAboutMediaError } = await import("@/lib/contact/about-repo");

const form = (description: string, mediaIds: string = "[]") => {
  const data = new FormData();
  data.set("description", description);
  data.set("mediaIds", mediaIds);
  return data;
};

const allLanguages = { translated: ["de", "fr", "pt", "es"], kept: [], failed: [] };

beforeEach(() => {
  vi.clearAllMocks();
  deps.getSession.mockResolvedValue("admin_1");
  deps.saveAbout.mockResolvedValue(undefined);
  deps.translateAbout.mockResolvedValue(allLanguages);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("saveAboutAction", () => {
  it("saves the description and the images, then translates", async () => {
    const result = await saveAboutAction(undefined, form("## Who we are", '["img_1","img_2"]'));

    expect(result).toEqual({ translated: "ok" });
    expect(deps.saveAbout).toHaveBeenCalledWith({
      description: "## Who we are",
      mediaIds: ["img_1", "img_2"],
    });
    expect(deps.saveAbout.mock.invocationCallOrder[0]).toBeLessThan(
      deps.translateAbout.mock.invocationCallOrder[0]!,
    );
  });

  it("refuses without a session, and writes nothing", async () => {
    deps.getSession.mockResolvedValue(null);

    expect((await saveAboutAction(undefined, form("x"))).message).toMatch(/session has expired/);
    expect(deps.saveAbout).not.toHaveBeenCalled();
  });

  it("refuses a description over the ceiling", async () => {
    const result = await saveAboutAction(undefined, form("x".repeat(ABOUT_DESCRIPTION_MAX + 1)));

    expect(result.errors?.description).toEqual(["The description is too long."]);
    expect(deps.saveAbout).not.toHaveBeenCalled();
  });

  it.each([
    ["not JSON", "{oops"],
    ["not a list", '{"id":"img_1"}'],
    ["too many", JSON.stringify(Array.from({ length: IMAGES_PER_ABOUT_MAX + 1 }, (_, i) => `img_${i}`))],
    ["a repeat", '["img_1","img_1"]'],
  ])("refuses an image field that is %s, rather than clearing the images", async (_, ids) => {
    const result = await saveAboutAction(undefined, form("text", ids));

    expect(result.errors?.mediaIds?.[0]).toMatch(/could not be read/);
    expect(deps.saveAbout).not.toHaveBeenCalled();
  });

  it("puts an image it may not claim under the images", async () => {
    deps.saveAbout.mockRejectedValue(new UnknownAboutMediaError());

    expect((await saveAboutAction(undefined, form("text", '["img_1"]'))).errors?.mediaIds).toEqual([
      "One of the images could not be found. Remove it and upload it again.",
    ]);
    expect(deps.translateAbout).not.toHaveBeenCalled();
  });

  it("says the save failed, without translating, when the database does", async () => {
    deps.saveAbout.mockRejectedValue(new Error("down"));

    expect((await saveAboutAction(undefined, form("text"))).message).toMatch(/could not be saved/);
    expect(deps.translateAbout).not.toHaveBeenCalled();
  });

  it("reports a failed translation as a saved page", async () => {
    deps.translateAbout.mockRejectedValue(new Error("down"));

    expect(await saveAboutAction(undefined, form("text"))).toEqual({ translated: "failed" });
  });
});
