import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirrors the `@/*` path in apps/web/tsconfig.json so component tests
    // import the way the app does.
    alias: { "@": new URL("./apps/web", import.meta.url).pathname },
  },

  test: {
    // jsdom rather than node: the component tests render to a document, and
    // nothing in the lib tests needs the bare environment.
    environment: "jsdom",

    include: [
      "apps/**/*.{test,spec}.{ts,tsx}",
      "packages/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],

    coverage: {
      provider: "v8",
      // `json-summary` is what TDD Guardian reads; `text` is for humans running
      // the lane by hand; `lcov` is for anything that wants per-line detail.
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "coverage",
      include: [
        "packages/*/src/**/*.ts",
        "apps/*/lib/**/*.{ts,tsx}",
        "apps/*/components/**/*.{ts,tsx}",
      ],
      exclude: ["**/*.d.ts", "**/*.{test,spec}.*"],
    },
  },
});
