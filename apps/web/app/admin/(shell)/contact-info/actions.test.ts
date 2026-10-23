import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveStoreContactAction } from "./actions";

/**
 * The Info screen's action, with the session and the repository stood in for.
 * What is left is what it decides: who may save, what is refused, what is
 * written.
 */
const deps = vi.hoisted(() => ({ getSession: vi.fn(), saveStoreContact: vi.fn() }));

vi.mock("@/lib/admin/session", () => ({ getSession: deps.getSession }));
vi.mock("@/lib/contact/store-contact-repo", () => ({ saveStoreContact: deps.saveStoreContact }));

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

const valid = {
  phone: "+1 234 567 890",
  email: "Info@Shop.com",
  whatsapp: "",
  address: "1 Main St",
  facebookUrl: "https://facebook.com/shop",
  instagramUrl: "",
  youtubeUrl: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  deps.getSession.mockResolvedValue("admin_1");
  deps.saveStoreContact.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("saveStoreContactAction", () => {
  it("saves the details, empty fields as null, and reports it saved", async () => {
    expect(await saveStoreContactAction(undefined, form(valid))).toEqual({ saved: true });
    expect(deps.saveStoreContact).toHaveBeenCalledWith({
      phone: "+1 234 567 890",
      email: "info@shop.com",
      whatsapp: null,
      address: "1 Main St",
      facebookUrl: "https://facebook.com/shop",
      instagramUrl: null,
      youtubeUrl: null,
    });
  });

  it("treats a missing field as empty", async () => {
    expect(await saveStoreContactAction(undefined, form({ phone: "1" }))).toEqual({ saved: true });
    expect(deps.saveStoreContact).toHaveBeenCalledWith(expect.objectContaining({ phone: "1", email: null }));
  });

  it("refuses a signed-out post and writes nothing", async () => {
    deps.getSession.mockResolvedValue(null);

    const state = await saveStoreContactAction(undefined, form(valid));

    expect(state.message).toMatch(/session has expired/);
    expect(deps.saveStoreContact).not.toHaveBeenCalled();
  });

  it("names a bad email and a link that is not http(s), and writes nothing", async () => {
    const state = await saveStoreContactAction(
      undefined,
      form({ ...valid, email: "nope", youtubeUrl: "javascript:alert(1)" }),
    );

    expect(Object.keys(state.errors ?? {}).sort()).toEqual(["email", "youtubeUrl"]);
    expect(state.errors?.youtubeUrl).toMatch(/https:\/\//);
    expect(deps.saveStoreContact).not.toHaveBeenCalled();
  });

  it("reports a failed write with a sentence", async () => {
    deps.saveStoreContact.mockRejectedValue(new Error("db down"));

    const state = await saveStoreContactAction(undefined, form(valid));

    expect(state.saved).toBeUndefined();
    expect(state.message).toMatch(/could not be saved/);
  });
});
