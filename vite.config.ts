import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  root: "src",
  publicDir: path.resolve(__dirname, "public"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.split(path.sep).join("/");
          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/") ||
            normalizedId.includes("/node_modules/react-is/")
          ) {
            return "vendor-react";
          }
          if (
            normalizedId.includes("/node_modules/rxdb/") ||
            normalizedId.includes("/node_modules/dexie/") ||
            normalizedId.includes("/node_modules/rxjs/") ||
            normalizedId.includes("/node_modules/mingo/")
          ) {
            return "vendor-rxdb";
          }
          if (
            normalizedId.includes("/node_modules/styled-components/") ||
            normalizedId.includes("/node_modules/@dnd-kit/") ||
            normalizedId.includes("/node_modules/usehooks-ts/") ||
            normalizedId.includes("/node_modules/stylis/")
          ) {
            return "vendor-ui";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@components": path.resolve(__dirname, "src/components"),
      "@context": path.resolve(__dirname, "src/context"),
      "@hooks": path.resolve(__dirname, "src/hooks"),
      "@utils": path.resolve(__dirname, "src/utils"),
      "@constants": path.resolve(__dirname, "src/constants"),
      "@storage": path.resolve(__dirname, "src/storage"),
      "@test": path.resolve(__dirname, "src/test"),
    },
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
    }),
  ],
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/index.tsx",
        "src/sw.ts",
        "src/test/**",
        "**/*.test.{ts,tsx}",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
  },
});
