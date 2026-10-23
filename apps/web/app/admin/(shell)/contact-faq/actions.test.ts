import { FAQ_DESCRIPTION_MAX } from "@my-ecommerce/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveFaqAction } from "./actions";

/**
 * The FAQ screen's action, with the session, the repository and the
 * translation pass stood in for. What is left is the order of things and what
 * each outcome reports.
 */
const deps = vi.hoisted(() => ({
  getSession: vi.fn(),
  saveEnglishFaqDescription: vi.fn(),
  translateFaq: vi.fn(),
}));

vi.mock("@/lib/admin/session", () => ({ getSession: deps.getSession }));
vi.mock("@/lib/contact/faq-repo", () => ({ saveEnglishFaqDescription: deps.saveEnglishFaqDescription }));
vi.mock("@/lib/admin/translations", () => ({ translateFaq: deps.translateFaq }));

const form = (description: string) => {
  const data = new FormData();
  data.set("description", description);
  return data;
};

const allLanguages = { translated: ["de", "fr", "pt", "es"], kept: [], failed: [] };

beforeEach(() => {
  vi.clearAllMocks();
  deps.getSession.mockResolvedValue("admin_1");
  deps.saveEnglishFaqDescription.mockResolvedValue(undefined);
  deps.translateFaq.mockResolvedValue(allLanguages);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("saveFaqAction", () => {
  it("saves English, then translates, and reports the translation", async () => {
    expect(await saveFaqAction(undefined, form("## Shipping"))).toEqual({ translated: "ok" });
    expect(deps.saveEnglishFaqDescription).toHaveBeenCalledWith("## Shipping");
    expect(deps.saveEnglishFaqDescription.mock.invocationCallOrder[0]).toBeLessThan(
      deps.translateFaq.mock.invocationCallOrder[0]!,
    );
  });

  it("accepts an empty description", async () => {
    expect(await saveFaqAction(undefined, form(""))).toEqual({ translated: "ok" });
    expect(deps.saveEnglishFaqDescription).toHaveBeenCalledWith("");
  });

  it("refuses a signed-out post and writes nothing", async () => {
    deps.getSession.mockResolvedValue(null);

    expect((await saveFaqAction(undefined, form("x"))).message).toMatch(/session has expired/);
    expect(deps.saveEnglishFaqDescription).not.toHaveBeenCalled();
  });

  it("refuses a description past the ceiling and writes nothing", async () => {
    const state = await saveFaqAction(undefined, form("x".repeat(FAQ_DESCRIPTION_MAX + 1)));

    expect(state.errors?.description).toHaveLength(1);
    expect(deps.saveEnglishFaqDescription).not.toHaveBeenCalled();
  });

  it("reports a failed save and does not translate", async () => {
    deps.saveEnglishFaqDescription.mockRejectedValue(new Error("db down"));

    const state = await saveFaqAction(undefined, form("x"));

    expect(state.message).toMatch(/could not be saved/);
    expect(deps.translateFaq).not.toHaveBeenCalled();
  });

  it("says translation is off when no engine is configured", async () => {
    deps.translateFaq.mockResolvedValue({
      translated: [],
      kept: [],
      failed: ["de", "fr", "pt", "es"].map((locale) => ({ locale, kind: "unconfigured" })),
    });

    expect(await saveFaqAction(undefined, form("x"))).toEqual({ translated: "off" });
  });

  it("reports a pass that throws as a failed translation, not a failed save", async () => {
    deps.translateFaq.mockRejectedValue(new Error("db down"));

    expect(await saveFaqAction(undefined, form("x"))).toEqual({ translated: "failed" });
  });
});
