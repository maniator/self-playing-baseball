import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectRegister: false,
      manifest: false,
      devOptions: {
        enabled: false,
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        rollupOptions: {
          input: path.resolve(process.cwd(), "src/sw.ts"),
        },
      },
    }),
  ],
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
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/react") || id.includes("/node_modules/react-dom") || id.includes("/node_modules/react-is")) {
            return "vendor-react";
          }
          if (id.includes("/node_modules/rxdb") || id.includes("/node_modules/dexie") || id.includes("/node_modules/rxjs") || id.includes("/node_modules/mingo")) {
            return "vendor-rxdb";
          }
          if (id.includes("/node_modules/styled-components") || id.includes("/node_modules/@dnd-kit") || id.includes("/node_modules/usehooks-ts") || id.includes("/node_modules/stylis")) {
            return "vendor-ui";
          }
        },
      },
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
  },
});
