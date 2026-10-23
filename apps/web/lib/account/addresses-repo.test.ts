import { beforeEach, describe, expect, it, vi } from "vitest";
import { addressFormValues, customerAddresses, isAddressKind, saveAddress } from "./addresses-repo";

/**
 * The address book against a stand-in for the database: whose rows are read,
 * what one save writes, and how a stored row comes back out.
 */
const db = vi.hoisted(() => ({ customerAddress: { findMany: vi.fn(), upsert: vi.fn() } }));

vi.mock("@my-ecommerce/db", () => ({ prisma: db }));

const ADDRESS = {
  countryCode: "CN",
  firstName: "John",
  lastName: "Michelad",
  line1: "Building 14, Dongbian New Village 2, Minzhi Street",
  line2: undefined,
  city: "Shenzhen",
  region: "Guangdong",
  postalCode: "518000",
  phone: undefined,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("customerAddresses", () => {
  it("reads this customer's rows only, and files each under its kind", async () => {
    db.customerAddress.findMany.mockResolvedValue([{ kind: "shipping", ...ADDRESS, line2: null, phone: null }]);

    const book = await customerAddresses("c_1");

    expect(db.customerAddress.findMany.mock.calls[0][0].where).toEqual({ customerId: "c_1" });
    expect(book).toEqual({ billing: null, shipping: ADDRESS });
  });
});

describe("saveAddress", () => {
  it("replaces the one address of that kind, storing a blank box as null", async () => {
    await saveAddress("c_1", "billing", ADDRESS);

    const call = db.customerAddress.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ customerId_kind: { customerId: "c_1", kind: "billing" } });
    expect(call.create).toMatchObject({ customerId: "c_1", kind: "billing", line2: null, phone: null });
    expect(call.update).toMatchObject({ firstName: "John", region: "Guangdong", line2: null });
    expect(call.update).not.toHaveProperty("customerId");
  });
});

describe("isAddressKind", () => {
  it("knows the two kinds and nothing else", () => {
    expect(["billing", "shipping", "home", ""].map(isAddressKind)).toEqual([true, true, false, false]);
  });
});

describe("addressFormValues", () => {
  it("turns an absent field into an empty box", () => {
    expect(addressFormValues(ADDRESS)).toMatchObject({ line2: "", phone: "", region: "Guangdong" });
  });
});
