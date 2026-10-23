import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateBlogAction } from "./actions";

/**
 * The edit action, with the session, the repository, the translation pass and
 * Next's redirect stood in for. What is left is what the action decides: who
 * may save, which id, what is refused, and the order of save and translate.
 */
const deps = vi.hoisted(() => ({
  getSession: vi.fn(),
  updateBlog: vi.fn(),
  translateBlog: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));

vi.mock("next/navigation", () => ({ redirect: deps.redirect }));
// The repository's error classes are real; its client is not needed by them.
vi.mock("@my-ecommerce/db", () => ({ prisma: {} }));
vi.mock("@/lib/admin/session", () => ({ getSession: deps.getSession }));
vi.mock("@/lib/admin/translations", () => ({ translateBlog: deps.translateBlog }));
vi.mock("@/lib/admin/blogs-repo", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/blogs-repo")>("@/lib/admin/blogs-repo");
  return { ...actual, createBlog: vi.fn(), updateBlog: deps.updateBlog };
});

const { BlogNotFoundError, UnknownCategoryError } = await import("@/lib/admin/blogs-repo");

function form(fields: Record<string, string> = {}) {
  const data = new FormData();
  const all = {
    id: "blog_1",
    title: "A new title",
    shortDescription: "",
    description: "## Body",
    categoryId: "cmcat000000000000000001",
    mediaIds: "[]",
    ...fields,
  };
  for (const [name, value] of Object.entries(all)) data.set(name, value);
  return data;
}

/** Runs the action and returns where it redirected to, or its state. */
async function run(data: FormData) {
  try {
    return { state: await updateBlogAction(undefined, data) };
  } catch (error) {
    return { redirectedTo: (error as { url?: string }).url };
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  deps.getSession.mockResolvedValue("admin_1");
  deps.updateBlog.mockResolvedValue(undefined);
  deps.translateBlog.mockResolvedValue({ translated: ["de", "fr", "pt", "es"], kept: [], failed: [] });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("updateBlogAction", () => {
  it("saves the post by its id, translates it, and returns to the list with the outcome", async () => {
    expect(await run(form())).toEqual({ redirectedTo: "/admin/blogs?translated=ok" });
    expect(deps.updateBlog).toHaveBeenCalledWith(
      "blog_1",
      expect.objectContaining({ title: "A new title", description: "## Body", mediaIds: [] }),
    );
    expect(deps.translateBlog).toHaveBeenCalledWith("blog_1");
    expect(deps.updateBlog.mock.invocationCallOrder[0]).toBeLessThan(
      deps.translateBlog.mock.invocationCallOrder[0]!,
    );
  });

  it("refuses a signed-out post and writes nothing", async () => {
    deps.getSession.mockResolvedValue(null);

    expect((await run(form())).state?.message).toMatch(/session has expired/);
    expect(deps.updateBlog).not.toHaveBeenCalled();
  });

  it("refuses a post with no id", async () => {
    expect((await run(form({ id: "" }))).state?.message).toMatch(/could not be identified/);
    expect(deps.updateBlog).not.toHaveBeenCalled();
  });

  it("names a missing title and writes nothing", async () => {
    expect((await run(form({ title: "" }))).state?.errors?.title).toEqual(["Enter a title."]);
    expect(deps.updateBlog).not.toHaveBeenCalled();
  });

  it("reports a category that is gone against the category field, and does not translate", async () => {
    deps.updateBlog.mockRejectedValue(new UnknownCategoryError());

    expect((await run(form())).state?.errors?.categoryId).toEqual([new UnknownCategoryError().message]);
    expect(deps.translateBlog).not.toHaveBeenCalled();
  });

  it("reports a post that is gone with a sentence", async () => {
    deps.updateBlog.mockRejectedValue(new BlogNotFoundError());

    expect((await run(form())).state?.message).toBe(new BlogNotFoundError().message);
  });
});
