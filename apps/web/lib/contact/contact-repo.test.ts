import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveContactMessage } from "./contact-repo";

/** The write, against a stand-in for the database. */
const db = vi.hoisted(() => ({ contactMessage: { create: vi.fn() } }));

vi.mock("@my-ecommerce/db", () => ({ prisma: { contactMessage: db.contactMessage } }));

beforeEach(() => {
  vi.clearAllMocks();
  db.contactMessage.create.mockResolvedValue({ id: "msg_1" });
});

describe("saveContactMessage", () => {
  it("writes the message with the sender's language and returns its id", async () => {
    const id = await saveContactMessage(
      { name: "Ada", email: "ada@example.com", subject: "Sizing", message: "Which pair?" },
      "de",
    );

    expect(id).toBe("msg_1");
    expect(db.contactMessage.create).toHaveBeenCalledWith({
      data: {
        name: "Ada",
        email: "ada@example.com",
        subject: "Sizing",
        message: "Which pair?",
        locale: "de",
      },
      select: { id: true },
    });
  });

  it("stores a missing subject as null", async () => {
    await saveContactMessage({ name: "Ada", email: "a@b.co", message: "Hi" }, "en");

    const [args] = db.contactMessage.create.mock.calls[0] as [{ data: { subject: unknown } }];
    expect(args.data.subject).toBeNull();
  });
});
