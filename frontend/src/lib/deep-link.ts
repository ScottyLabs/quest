import { onOpenUrl } from "@tauri-apps/plugin-deep-link";

export function setupDeepLinks() {
	if (!("__TAURI__" in window)) return;

	onOpenUrl((urls) => {
		console.log("Deep link received:", urls);

		// Handle OAuth callback
		for (const url of urls) {
			console.log("Processing URL:", url);
		}
	});
}
