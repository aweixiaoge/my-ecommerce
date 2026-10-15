import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The client module itself.
 *
 * Imported dynamically and after `resetModules`, because the whole point of
 * the file is what happens at import time — the singleton and the check on the
 * connection string. Neither can be observed from a statically imported
 * binding, which would have been resolved once for the whole run.
 *
 * Constructing the client touches nothing: Prisma connects when a query runs,
 * and the driver adapter only holds the connection string until then.
 */
const env = process.env as Record<string, string | undefined>;
let original: string | undefined;

beforeEach(() => {
  vi.resetModules();
  // The singleton lives on `globalThis`, which `resetModules` does not clear —
  // otherwise the second import in a test would return the client the first one
  // built and the check on construction would never run again.
  delete (globalThis as { __prismaClient?: unknown }).__prismaClient;
  original = env.DATABASE_URL;
});

afterEach(() => {
  if (original === undefined) delete env.DATABASE_URL;
  else env.DATABASE_URL = original;
});

describe("the database client", () => {
  it("says what is missing rather than letting the driver fail", async () => {
    // The usual cause is a fresh clone with no `.env`, and the driver's own
    // report of a missing connection string is a parse error from inside its
    // internals — which reads as a bug in this file.
    delete env.DATABASE_URL;

    await expect(import("./index")).rejects.toThrow(/DATABASE_URL is not set/);
  });

  it("builds a client from the connection string it was given", async () => {
    env.DATABASE_URL = "postgresql://user:password@localhost:5432/example";

    const module = await import("./index");

    expect(module.prisma).toBeDefined();
  });

  it("hands out one client per process", async () => {
    // A client owns a connection pool, and `next dev` re-evaluates a module
    // whenever it or anything it imports changes — one pool per edit would run
    // Postgres out of connections.
    env.DATABASE_URL = "postgresql://user:password@localhost:5432/example";

    const first = await import("./index");
    vi.resetModules();
    const second = await import("./index");

    expect(second.prisma).toBe(first.prisma);
  });
});
