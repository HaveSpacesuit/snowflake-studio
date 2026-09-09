import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Two entry points: the Studio editor (index.html) and the Collection page
// (collection.html). Vite bundles each and serves them during `npm run dev`.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    // Always use the same port instead of falling back to the next free one,
    // so agent tooling (and Eric) can rely on a predictable dev server URL.
    port: 5173,
    strictPort: true
  },
  build: {
    assetsInlineLimit: (filePath) => {
      if (filePath.endsWith(".svg")) return false;
      return undefined;
    },
    rollupOptions: {
      input: {
        studio: resolve(__dirname, "index.html"),
        collection: resolve(__dirname, "collection.html")
      }
    }
  }
});
