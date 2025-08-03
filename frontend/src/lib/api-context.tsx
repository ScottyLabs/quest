import createFetchClient from "openapi-fetch";
import createClient, { type OpenapiQueryClient } from "openapi-react-query";
import { createContext, type ReactNode, useContext } from "react";

import type { paths } from "@/lib/schema.gen";

interface ApiContextValue {
	client: OpenapiQueryClient<paths>;
	baseUrl: string;
}

const ApiContext = createContext<ApiContextValue | null>(null);

function getApiConfig() {
	const { hostname } = window.location;
	const isDev =
		hostname === "localhost" ||
		hostname === "127.0.0.1" ||
		hostname === "tauri.localhost";

	// Dev configuration
	if (isDev) {
		return "http://localhost:3000";
	}

	// Production configuration
	if (hostname === "cmu.quest") {
		return "https://api.cmu.quest";
	}

	if (hostname === "quest.scottylabs.org") {
		return "https://api.quest.scottylabs.org";
	}

	// Fallback to production
	return "https://api.quest.scottylabs.org";
}

interface ApiProviderProps {
	children: ReactNode;
}

export function ApiProvider({ children }: ApiProviderProps) {
	const baseUrl = getApiConfig();
	const fetchClient = createFetchClient<paths>({
		baseUrl,
		credentials: "include",
	});

	return (
		<ApiContext.Provider
			value={{
				client: createClient(fetchClient),
				baseUrl,
			}}
		>
			{children}
		</ApiContext.Provider>
	);
}

export function useApi() {
	const context = useContext(ApiContext);
	if (!context) {
		throw new Error("useApi must be used within an ApiProvider");
	}

	return context;
}
