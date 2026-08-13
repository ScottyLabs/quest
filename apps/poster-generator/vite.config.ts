import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  assetsInclude: ["**/*.svg"],
  server: {
    host: true,
    port: 5175,
    strictPort: true,
  },
});
