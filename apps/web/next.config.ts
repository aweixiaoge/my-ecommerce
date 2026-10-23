import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import type { NextConfig } from "next";

/*
 * One `.env` for the whole repository, loaded before anything reads it.
 *
 * Next loads environment files from the app directory, and the database lives
 * outside this app: `docker compose` reads the root `.env` to decide what to
 * create, and `packages/db/prisma.config.ts` loads it by path for migrations.
 * A second copy under `apps/web` would be a second thing to keep in step, and
 * what drifts is the password — which fails as "authentication failed" against
 * a database whose credentials look right.
 *
 * The file is gitignored and absent in production, where the platform supplies
 * the variable; `dotenv` doing nothing there is the correct behaviour.
 */
config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
  quiet: true,
});

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The database package is a workspace of TypeScript sources too — the
  // generated client and the repository layer both ship as `.ts`.
  transpilePackages: ["@my-ecommerce/shared", "@my-ecommerce/db"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    /*
     * A 404 for a URL that matches no route.
     *
     * The storefront now has two root layouts and a root layout under a
     * top-level dynamic segment (`app/[lang]`), which are the two cases the
     * framework names as needing a global 404: there is no single layout to
     * compose one from, so without this file the framework falls back to its
     * own unstyled page.
     */
    globalNotFound: true,
    serverActions: {
      /*
       * Files no longer travel through an action: uploads go to the
       * `POST /admin/media` route handler, which reads its own body, so a 50 MB
       * product video never meets this limit. It was sized for one 3 MB image
       * when they did, and is left there rather than lowered blind — the
       * limit is global, and the forms that remain send a few hundred bytes of
       * ids and text. Raising it for uploads would raise it for every action
       * in the app, sign-in included, which is why uploads moved instead.
       */
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
