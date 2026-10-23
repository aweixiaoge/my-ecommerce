import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminUserAction } from "./actions";

/**
 * The create-user action, with the session, the repository and Next's redirect
 * stood in for. What is left is what the action decides: who may save, what is
 * refused and with what words, and where a save goes.
 */
const deps = vi.hoisted(() => ({
  getSession: vi.fn(),
  createAdminUser: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));

vi.mock("next/navigation", () => ({ redirect: deps.redirect }));
vi.mock("@my-ecommerce/db", () => ({ prisma: {} }));
vi.mock("@/lib/admin/session", () => ({ getSession: deps.getSession }));
vi.mock("@/lib/admin/admin-users-repo", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/admin-users-repo")>(
    "@/lib/admin/admin-users-repo",
  );
  return { ...actual, createAdminUser: deps.createAdminUser };
});

const { DuplicateAdminNameError } = await import("@/lib/admin/admin-users-repo");

function form(fields: Record<string, string> = {}) {
  const data = new FormData();
  const all = { name: "jane", password: "long-enough", confirmPassword: "long-enough", ...fields };
  for (const [name, value] of Object.entries(all)) data.append(name, value);
  return data;
}

async function save(data: FormData) {
  try {
    return { state: await createAdminUserAction(undefined, data) };
  } catch (error) {
    return { redirectedTo: (error as { url?: string }).url };
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  deps.getSession.mockResolvedValue("adm_01");
  deps.createAdminUser.mockResolvedValue({ id: "row_new" });
});

describe("createAdminUserAction", () => {
  it("creates the user and goes back to the list", async () => {
    expect(await save(form({ name: "  jane  " }))).toEqual({ redirectedTo: "/admin/users" });
    expect(deps.createAdminUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: "jane", password: "long-enough" }),
    );
  });

  it("writes nothing without a session", async () => {
    deps.getSession.mockResolvedValue(null);
    const result = await save(form());
    expect(result.state?.message).toMatch(/session has expired/);
    expect(deps.createAdminUser).not.toHaveBeenCalled();
  });

  it("says when the passwords do not match", async () => {
    const result = await save(form({ confirmPassword: "different-one" }));
    expect(result.state?.errors).toEqual({ confirmPassword: ["The passwords do not match."] });
    expect(deps.createAdminUser).not.toHaveBeenCalled();
  });

  it("gives one sentence per field", async () => {
    const result = await save(form({ name: "", password: "short", confirmPassword: "short" }));
    expect(result.state?.errors).toEqual({
      name: ["Enter a username."],
      password: ["Use at least 8 characters."],
    });
  });

  it("puts a taken name on the name field", async () => {
    deps.createAdminUser.mockRejectedValue(new DuplicateAdminNameError());
    const result = await save(form());
    expect(result.state?.errors).toEqual({ name: ["Another admin already uses this name."] });
  });

  it("reports a failed save without leaking the error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    deps.createAdminUser.mockRejectedValue(new Error("connection refused"));
    const result = await save(form());
    expect(result.state?.message).toMatch(/could not be saved/);
  });
});
