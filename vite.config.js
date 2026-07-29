import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Two entry points: the Studio editor (index.html) and the Collection page
// (collection.html). Vite bundles each and serves them during `npm run dev`.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        studio: resolve(__dirname, "index.html"),
        collection: resolve(__dirname, "collection.html")
      }
    }
  }
});
