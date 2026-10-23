import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMessages } from "@/lib/i18n/messages";
import { sendContactMessageAction } from "./actions";

/**
 * The Contact form's action, with the repository stood in for. What is left is
 * what the action decides: what is refused and in which words, what is kept,
 * and what a failure looks like.
 */
const deps = vi.hoisted(() => ({ saveContactMessage: vi.fn() }));

vi.mock("@/lib/contact/contact-repo", () => ({ saveContactMessage: deps.saveContactMessage }));

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

const valid = {
  locale: "en",
  name: "Ada",
  email: "Ada@Example.com",
  subject: "",
  message: "Which pair suits running?",
};

beforeEach(() => {
  vi.clearAllMocks();
  deps.saveContactMessage.mockResolvedValue("msg_1");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("sendContactMessageAction", () => {
  it("saves a valid message in the form's language and reports it sent", async () => {
    const state = await sendContactMessageAction(undefined, form({ ...valid, locale: "fr" }));

    expect(state).toEqual({ status: "sent" });
    expect(deps.saveContactMessage).toHaveBeenCalledWith(
      { name: "Ada", email: "ada@example.com", subject: undefined, message: "Which pair suits running?" },
      "fr",
    );
  });

  it("refuses missing boxes in the form's language, keeps what was typed, and saves nothing", async () => {
    const errors = getMessages("de").contactPage.errors;

    const state = await sendContactMessageAction(
      undefined,
      form({ locale: "de", name: " ", email: "nope", subject: "Hi", message: "" }),
    );

    expect(state).toEqual({
      status: "invalid",
      errors: { name: errors.required, email: errors.email, message: errors.required },
      values: { name: " ", email: "nope", subject: "Hi", message: "" },
    });
    expect(deps.saveContactMessage).not.toHaveBeenCalled();
  });

  it("names an over-long box as too long rather than missing", async () => {
    const state = await sendContactMessageAction(undefined, form({ ...valid, name: "x".repeat(201) }));

    expect(state).toMatchObject({ status: "invalid", errors: { name: getMessages("en").contactPage.errors.tooLong } });
  });

  it("falls back to the default language for a tampered locale", async () => {
    await sendContactMessageAction(undefined, form({ ...valid, locale: "xx" }));

    expect(deps.saveContactMessage).toHaveBeenCalledWith(expect.anything(), "en");
  });

  it("reports a failed save with a sentence and keeps the message", async () => {
    deps.saveContactMessage.mockRejectedValue(new Error("db down"));

    const state = await sendContactMessageAction(undefined, form(valid));

    expect(state).toEqual({
      status: "failed",
      message: getMessages("en").contactPage.errors.failed,
      values: { name: "Ada", email: "Ada@Example.com", subject: "", message: "Which pair suits running?" },
    });
  });
});
