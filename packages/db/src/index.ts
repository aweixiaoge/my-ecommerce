import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

/**
 * The database client.
 *
 * A package of its own rather than a file in the web app, because plan.md gives
 * data access to a Fastify API that does not exist yet: when it arrives it
 * takes this package over, and `apps/web` is left holding its own callers
 * rather than a client it was never supposed to own.
 *
 * The generated client is TypeScript, generated into `src/generated` and
 * committed to nothing — `pnpm --filter @my-ecommerce/db db:generate` produces
 * it, and the workspace transpiles it on the way through.
 */

/**
 * One client per process, pinned to `globalThis`.
 *
 * Two reasons, and the second is the one that bites: a client owns a connection
 * pool, so one per import is a pool per import; and `next dev` re-evaluates a
 * module whenever it or anything it imports changes, which would hand out a new
 * pool on every edit while the old ones stayed open until Postgres refused to
 * accept more. Same reasoning as the mock stores this replaces.
 */
const globalForPrisma = globalThis as unknown as {
  __prismaClient?: PrismaClient;
};

function connect(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // Named here rather than left to the driver, which reports a missing
    // connection string as a parse error from somewhere in its own internals.
    // The usual cause is a fresh clone with no `.env` — see `.env.example`.
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and start the " +
        "database with `docker compose up -d`.",
    );
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma = (globalForPrisma.__prismaClient ??= connect());

export { PrismaClient };
export type {
  Blog,
  BlogCategory,
  BlogCategoryTranslation,
  BlogTranslation,
  Category,
  CategoryTranslation,
  FeaturedProduct,
  Media,
  Prisma,
  Product,
  ProductCategory,
  ProductOption,
  ProductOptionValue,
  ProductStatus,
  ProductTranslation,
  ProductVariant,
} from "./generated/client";
