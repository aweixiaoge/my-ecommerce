import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_STORE_CONTACT, getStoreContact, saveStoreContact } from "./store-contact-repo";

/** The one-row reads and writes, against a stand-in for the database. */
const db = vi.hoisted(() => ({ storeContact: { findUnique: vi.fn(), upsert: vi.fn() } }));

vi.mock("@my-ecommerce/db", () => ({ prisma: { storeContact: db.storeContact } }));

const contact = {
  phone: "+1 234",
  email: "info@shop.com",
  whatsapp: null,
  address: "1 Main St",
  facebookUrl: "https://facebook.com/shop",
  instagramUrl: null,
  youtubeUrl: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getStoreContact", () => {
  it("reads the shop's one row", async () => {
    db.storeContact.findUnique.mockResolvedValue(contact);

    expect(await getStoreContact()).toEqual(contact);
    expect(db.storeContact.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
  });

  it("reads a missing row as every field empty", async () => {
    db.storeContact.findUnique.mockResolvedValue(null);

    expect(await getStoreContact()).toEqual(EMPTY_STORE_CONTACT);
  });
});

describe("saveStoreContact", () => {
  it("writes every field to the one row, creating it if it is gone", async () => {
    await saveStoreContact(contact);

    expect(db.storeContact.upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      create: { id: 1, ...contact },
      update: contact,
    });
  });
});
