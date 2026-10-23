import { beforeEach, describe, expect, it, vi } from "vitest";
import { listContactMessages } from "./contact-messages-repo";

/** The list's query, against a stand-in for the database. */
const db = vi.hoisted(() => ({ contactMessage: { findMany: vi.fn() } }));

vi.mock("@my-ecommerce/db", () => ({ prisma: { contactMessage: db.contactMessage } }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listContactMessages", () => {
  it("lists newest first, with the date as ISO 8601", async () => {
    db.contactMessage.findMany.mockResolvedValue([
      {
        id: "msg_1",
        name: "Ada",
        email: "ada@example.com",
        subject: null,
        message: "Which pair?",
        locale: "de",
        createdAt: new Date("2026-10-22T08:00:00.000Z"),
      },
    ]);

    expect(await listContactMessages()).toEqual([
      {
        id: "msg_1",
        name: "Ada",
        email: "ada@example.com",
        subject: null,
        message: "Which pair?",
        locale: "de",
        createdAt: "2026-10-22T08:00:00.000Z",
      },
    ]);

    const [args] = db.contactMessage.findMany.mock.calls[0] as [{ orderBy: unknown }];
    expect(args.orderBy).toEqual([{ createdAt: "desc" }, { id: "asc" }]);
  });
});
