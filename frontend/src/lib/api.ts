import { openUrl } from "@tauri-apps/plugin-opener";
import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";

import type { paths } from "@/lib/schema.gen";

interface FetchClientOptions {
	baseUrl: string;
	credentials?: RequestCredentials;
}

function createQueryClient({
	baseUrl,
	credentials = "include",
}: FetchClientOptions) {
	const fetchClient = createFetchClient<paths>({ baseUrl, credentials });

	return createClient(fetchClient);
}

export function createGatewayClient(baseUrl: string, client: string) {
	async function logout() {
		const logoutUrl = `${baseUrl}/logout`;
		const form = document.createElement("form");
		form.method = "POST";
		form.action = logoutUrl;

		document.body.appendChild(form);
		form.submit();
	}

	async function login(path: string) {
		const isDev =
			window.location.hostname === "localhost" &&
			window.location.protocol !== "tauri:"; // don't consider iOS dev

		// auth is mocked in development
		if (isDev) {
			window.location.href = path;
			return;
		}

		// On mobile, we can't redirect to tauri.localhost (Android) or localhost (iOS),
		// so replace it with an actual domain that we will capture via a deep link
		const redirect = new URL(
			path,
			"__TAURI__" in window
				? "https://quest.scottylabs.org" // corresponds to the fallback baseUrl
				: window.location.origin,
		).toString();

		const loginUrl = `${baseUrl}/oauth2/authorization/${client}?redirect_uri=${encodeURIComponent(redirect)}`;

		if ("__TAURI__" in window) {
			// On mobile, we can't authenticate from within a WebView,
			// so instead open the login URL in the system browser
			await openUrl(loginUrl);
		} else {
			window.location.href = loginUrl;
		}
	}

	return {
		$api: createQueryClient({ baseUrl }),
		logout,
		login,
	};
}
