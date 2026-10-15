import { describe, expect, it } from "vitest";
import type { AdminProductCreate } from "@my-ecommerce/shared";
import {
  assertMockProductStoreAllowed,
  createProduct,
  listCreatedProducts,
} from "./admin-products";

/**
 * A payload the shared schema would have accepted — this store takes validated
 * input, so the fixtures here are already trimmed and de-duplicated.
 */
function draft(overrides: Partial<AdminProductCreate> = {}): AdminProductCreate {
  return {
    name: "Studio Over-Ear",
    shortDescription: "Closed-back, tuned flat.",
    description: "## Materials\n\n- Aluminium",
    attributes: [{ kind: "color", values: ["Black", "Sand"] }],
    ...overrides,
  };
}

describe("createProduct", () => {
  it("stores what it was given and returns the record", async () => {
    const record = await createProduct(draft({ name: "Aerophone One" }));

    expect(record).toMatchObject({
      name: "Aerophone One",
      shortDescription: "Closed-back, tuned flat.",
      description: "## Materials\n\n- Aluminium",
      attributes: [{ kind: "color", values: ["Black", "Sand"] }],
    });
  });

  it("mints an id that cannot collide with a seeded product", async () => {
    // Seeded products are `prod_<slug>` (lib/mock/catalog.ts); a created draft
    // has no slug yet, so it must not look like one.
    const record = await createProduct(draft());

    expect(record.id).toMatch(/^prod_draft_\d+$/);
  });

  it("creates a draft, never something for sale", async () => {
    // plan.md puts price and stock on the variant. Nothing this form collects
    // could make a product purchasable, so the status is not a form field.
    const record = await createProduct(draft());

    expect(record.status).toBe("draft");
  });

  it("gives every product its own id", async () => {
    const first = await createProduct(draft());
    const second = await createProduct(draft());

    expect(first.id).not.toBe(second.id);
  });

  it("lists the newest product first", async () => {
    const first = await createProduct(draft({ name: "Created first" }));
    const second = await createProduct(draft({ name: "Created second" }));

    const listed = await listCreatedProducts();

    expect(listed.findIndex((p) => p.id === second.id)).toBeLessThan(
      listed.findIndex((p) => p.id === first.id),
    );
    expect(listed[0]?.id).toBe(second.id);
  });

  it("does not hand the store to the caller", async () => {
    // A caller that edits the record it was given — or the payload it sent —
    // must not be editing the store. This is the bug that makes a list show
    // values nobody saved.
    const payload = draft({ name: "Ownership" });
    const returned = await createProduct(payload);

    returned.name = "Edited by caller";
    returned.attributes[0]!.values.push("Edited by caller");
    payload.name = "Edited at the source";
    payload.attributes[0]!.values.push("Edited at the source");

    const stored = (await listCreatedProducts()).find(
      (p) => p.id === returned.id,
    );

    expect(stored?.name).toBe("Ownership");
    expect(stored?.attributes[0]?.values).toEqual(["Black", "Sand"]);
  });

  it("does not hand the store to the caller on read either", async () => {
    const created = await createProduct(draft({ name: "Read ownership" }));

    const firstRead = (await listCreatedProducts()).find(
      (p) => p.id === created.id,
    );
    firstRead!.attributes[0]!.values.push("Edited on read");

    const secondRead = (await listCreatedProducts()).find(
      (p) => p.id === created.id,
    );

    expect(secondRead?.attributes[0]?.values).toEqual(["Black", "Sand"]);
  });
});

describe("the production guard", () => {
  it("refuses to serve the mock store in a production build", () => {
    expect(() => assertMockProductStoreAllowed("production")).toThrow(
      /mock product store is active in a production build/,
    );
  });

  it("allows every other environment", () => {
    for (const env of ["development", "test", undefined]) {
      expect(() => assertMockProductStoreAllowed(env)).not.toThrow();
    }
  });

  it("is wired into both functions, not merely defined", async () => {
    // A guard nothing calls protects nothing. Set the real environment
    // variable so this fails if the call sites are removed.
    // `@types/node` declares NODE_ENV readonly; it is writable at runtime.
    const env = process.env as Record<string, string | undefined>;
    const original = env.NODE_ENV;
    env.NODE_ENV = "production";
    try {
      await expect(createProduct(draft())).rejects.toThrow();
      await expect(listCreatedProducts()).rejects.toThrow();
    } finally {
      env.NODE_ENV = original;
    }
  });
});
