import type { AdminProductCreate, AttributeKind } from "@my-ecommerce/shared";

/**
 * Where the admin's product form writes.
 *
 * There is no API and no database yet, so this stands in for the `products`
 * table — the write side of the catalog only. The storefront reads
 * `lib/mock/catalog.ts`, which is seeded and read-only; created drafts live
 * here and the admin list shows the two together.
 *
 * Same shape as the other mocks: async getters with the signatures the real API
 * client will have, so replacing this file is a swap rather than a rewrite.
 */

export interface AdminProductAttributeRecord {
  kind: AttributeKind;
  values: string[];
}

export interface AdminProductRecord {
  id: string;
  name: string;
  shortDescription: string;
  /** Markdown source, stored as written. */
  description: string;
  attributes: AdminProductAttributeRecord[];
  /**
   * Always `draft`. plan.md gives products a status and gives price and stock
   * to the variant, so a product with no variants yet is not for sale — and
   * nothing in this form could make it active.
   */
  status: "draft";
}

/**
 * Refuses to serve the mock product store in a production build.
 *
 * The same guard, for the same reason, as `admin-users.ts`: the realistic
 * failure is that the API is not ready, someone deploys anyway, and the admin
 * appears to save products into a store that forgets them on restart — or,
 * worse, a mock store is where real catalogue data is believed to be. This
 * turns that into a crash on the first request instead of a silent data loss.
 */
export function assertMockProductStoreAllowed(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): void {
  if (nodeEnv === "production") {
    throw new Error(
      "The mock product store is active in a production build. Replace " +
        "lib/mock/admin-products.ts with the real API client before deploying.",
    );
  }
}

/**
 * Pinned to `globalThis`, not a module binding.
 *
 * `next dev` re-evaluates a module when it or anything it imports changes, and
 * a module-level array would be replaced on every edit — products created a
 * minute ago would vanish with no error to explain it, which reads as "the
 * save is broken" rather than "this is a mock". Same reasoning as the session
 * store's Map.
 *
 * The counter lives in the same slot for the same reason, and it is the subtler
 * half: a module-level counter would reset to 1 on every edit while the rows it
 * had already id'd stayed put, so the next product created would reuse an
 * existing id. Two rows, one id — duplicate React keys, and an edit aimed at
 * one product landing on the other.
 */
const storeGlobal = globalThis as unknown as {
  __adminProductStore?: { products: AdminProductRecord[]; nextId: number };
};

const store = (storeGlobal.__adminProductStore ??= { products: [], nextId: 1 });

/**
 * Newest first, which is the order the list wants and the order a store has to fake.
 *
 * A readable sequence rather than a UUID: ids are internal here (plan.md keeps
 * the human-facing identifier separate, on orders), and `prod_draft_` makes a
 * created row easy to tell from a seeded one at a glance.
 */
export async function listCreatedProducts(): Promise<AdminProductRecord[]> {
  assertMockProductStoreAllowed();

  return store.products.map(copyRecord);
}

/**
 * A copy all the way down.
 *
 * A shallow spread is the obvious version and it is not enough: `attributes`
 * and each `values` array inside it would still be the store's own arrays, so a
 * caller that pushes a value onto what it was handed edits the store through
 * the copy. There is no mutation path in this app yet, which is exactly why the
 * bug would sit here until there is one.
 */
function copyRecord(record: AdminProductRecord): AdminProductRecord {
  return {
    ...record,
    attributes: record.attributes.map((attribute) => ({
      kind: attribute.kind,
      values: [...attribute.values],
    })),
  };
}

/**
 * Stores a draft and returns what was stored.
 *
 * It takes the *validated* payload — the shared schema has already run at the
 * action boundary. Validating again here would put a second set of rules in a
 * second place, which is how the two drift apart.
 *
 * The stored record is copied out on the way in and on the way out: a caller
 * that mutates what it gets back must not be able to edit the store behind it.
 */
export async function createProduct(
  input: AdminProductCreate,
): Promise<AdminProductRecord> {
  assertMockProductStoreAllowed();

  const record: AdminProductRecord = {
    id: `prod_draft_${String(store.nextId++).padStart(2, "0")}`,
    name: input.name,
    shortDescription: input.shortDescription,
    description: input.description,
    attributes: input.attributes.map((attribute) => ({
      kind: attribute.kind,
      values: [...attribute.values],
    })),
    status: "draft",
  };

  // The record is built fresh from the input, so the store can keep it as is —
  // nothing outside holds a reference to it until the copy below.
  store.products.unshift(record);

  return copyRecord(record);
}
