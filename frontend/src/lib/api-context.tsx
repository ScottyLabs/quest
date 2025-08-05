import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";
import { createContext, type ReactNode, useContext } from "react";
import type { paths } from "@/lib/schema.gen";

const CLIENT = "quest";

const getApiConfig = (): string => {
	const { hostname } = window.location;

	if (
		hostname === "localhost" ||
		hostname === "127.0.0.1" ||
		hostname === "tauri.localhost"
	) {
		return "http://localhost:3000";
	}

	if (hostname === "cmu.quest") {
		return "https://api.cmu.quest";
	}

	// Default to quest.scottylabs.org API for all other cases
	return "https://api.quest.scottylabs.org";
};

const createApiClient = (baseUrl: string) => {
	const fetchClient = createFetchClient<paths>({
		baseUrl,
		credentials: "include",
	});

	return {
		baseUrl,
		$api: createClient(fetchClient),

		async logout() {
			const form = document.createElement("form");
			form.method = "POST";
			form.action = `${baseUrl}/logout`;

			document.body.appendChild(form);
			form.submit();
		},

		async login(path: string) {
			const isDev = ["localhost", "tauri.localhost"].includes(
				window.location.hostname,
			);

			// auth mocked in dev
			if (isDev) {
				window.location.href = path;
				return;
			}

			const redirect = new URL(path, window.location.origin).toString();
			const loginUrl = `${baseUrl}/oauth2/authorization/${CLIENT}?redirect_uri=${encodeURIComponent(redirect)}`;

			window.location.href = loginUrl;
		},
	};
};

// Context setup
type ApiContextType = ReturnType<typeof createApiClient>;
const ApiContext = createContext<ApiContextType | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
	const client = createApiClient(getApiConfig());

	return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function useApi() {
	const context = useContext(ApiContext);
	if (!context) {
		throw new Error("useApi must be used within an ApiProvider");
	}

	return context;
}
