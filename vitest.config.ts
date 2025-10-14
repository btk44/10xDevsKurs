import { defineConfig } from "vitest/config";
import react from "@astrojs/react";
import { fileURLToPath } from "node:url";
import { mergeConfig } from "vite";
import vite from "./astro.config.mjs";

export default mergeConfig(
  vite,
  defineConfig({
    plugins: [react()],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./tests/setup.ts"],
      include: ["**/*.{test,spec}.{ts,tsx}"],
      exclude: ["node_modules", "dist", ".idea", ".git", ".cache", "e2e/**/*"],
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        exclude: ["node_modules/", "dist/", "**/*.d.ts", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "tests/setup.ts"],
      },
    },
    resolve: {
      alias: {
        "~": fileURLToPath(new URL("./src", import.meta.url)),
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  })
);
