import react from "@vitejs/plugin-react";
import path from "path";
import type { PluginOption } from "vite";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  root: "src",
  publicDir: path.resolve(__dirname, "public"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.split(path.sep).join("/");
          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/") ||
            normalizedId.includes("/node_modules/react-is/")
          ) {
            return "react-vendor";
          }
          if (
            normalizedId.includes("/node_modules/rxdb/") ||
            normalizedId.includes("/node_modules/dexie/") ||
            normalizedId.includes("/node_modules/rxjs/") ||
            normalizedId.includes("/node_modules/mingo/")
          ) {
            return "rxdb-vendor";
          }
          if (normalizedId.includes("/node_modules/styled-components/")) {
            return "styled-vendor";
          }
          if (normalizedId.includes("/node_modules/@dnd-kit/")) {
            return "dnd-vendor";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@storage": path.resolve(__dirname, "src/storage"),
      "@test": path.resolve(__dirname, "src/test"),
      "@feat": path.resolve(__dirname, "src/features"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? mode),
  },
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: ".",
      filename: "sw.ts",
      injectRegister: false,
      manifest: false,
      injectManifest: {
        rollupFormat: "es",
      },
    }) as PluginOption,
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/react-global.ts", "./test/setup.ts"],
    coverage: {
      provider: "v8",
      // Patterns are relative to the vitest root, which is "src/" (set by
      // `root: "src"` above).  Do NOT prefix with "src/" — that would look
      // for src/src/** which never exists.
      include: ["**/*.{ts,tsx}"],
      exclude: [
        "index.tsx",
        "sw.ts",
        "test/**",
        "**/*.test.{ts,tsx}",
        "../e2e/**",
        "../playwright.config.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
  },
}));
