import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

/**
 * The Prisma CLI's configuration.
 *
 * Prisma 7 reads the datasource URL from here rather than from the schema, and
 * does not load `.env` on its own — hence the explicit call below.
 *
 * The path is the repository root, not this package, and that is the point:
 * `docker compose` reads the same file from the same directory, so the user the
 * container is created with is the user the connection string names. A copy
 * under here would be a second thing to keep in step, and the failure when they
 * drift is "authentication failed" against a database that looks correct.
 *
 * `fileURLToPath` rather than a bare relative path: this file is loaded by the
 * CLI from whatever directory the command was run in, and a relative path would
 * resolve against that rather than against the package.
 */
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    /*
     * Read from the environment rather than through the `env()` helper, which
     * throws when the variable is missing.
     *
     * This file is loaded by every Prisma command, and `generate` needs no
     * database at all — it reads the schema. Throwing here would mean a fresh
     * clone could not generate its client, and so could not typecheck or build,
     * until someone had copied `.env`; the package's `postinstall` would fail
     * and take `pnpm install` with it. Passing the empty value along leaves the
     * complaint to the commands that actually open a connection, where it is
     * the right shape and arrives with the URL in hand.
     */
    url: process.env["DATABASE_URL"] ?? "",
    /**
     * `prisma migrate dev` needs a second, empty database to replay the
     * migration history into — that replay is how it detects drift. Without
     * this, it points at the database it is about to migrate.
     *
     * The local dev server publishes both; `prisma dev ls` prints them. A real
     * Postgres creates the shadow database itself and needs no entry here, so
     * this line is about the local server rather than about the schema.
     */
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"] ?? "",
  },
});
