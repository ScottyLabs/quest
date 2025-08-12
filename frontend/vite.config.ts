import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";
import tsConfigPaths from "vite-tsconfig-paths";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
	plugins: [
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
		}),
		react(),
		svgr(),
		VitePWA({
			devOptions: {
				enabled: true,
			},
			includeAssets: [
				"apple-touch-icon.png",
				"favicon-96x96.png",
				"favicon.ico",
				"favicon.svg",
				"web-app-manifest-192x192.png",
				"web-app-manifest-512x512.png",
			],
			manifest: {
				name: "O-Quest",
				short_name: "O-Quest",
				icons: [
					{
						src: "/web-app-manifest-192x192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "maskable",
					},
					{
						src: "/web-app-manifest-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
				theme_color: "#202326",
				background_color: "#202326",
				display: "standalone",
			},
		}),
		tailwindcss(),
		tsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
		{
			// This only applies during dev, nginx handles this in production
			name: "well-known-json-headers",
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					if (req.url?.startsWith("/.well-known/")) {
						res.setHeader("Content-Type", "application/json");
					}
					next();
				});
			},
		},
	],

	// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
	//
	// 1. prevent vite from obscuring rust errors
	clearScreen: false,
	// 2. tauri expects a fixed port, fail if that port is not available
	server: {
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: "ws",
					host,
					port: 1421,
				}
			: undefined,
		watch: {
			// 3. tell vite to ignore watching `src-tauri`
			ignored: ["**/src-tauri/**"],
		},
	},
}));
