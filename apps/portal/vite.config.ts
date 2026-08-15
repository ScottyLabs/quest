import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

const backend = "http://127.0.0.1:8080";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": backend,
      "/auth": backend,
    },
  },
});
