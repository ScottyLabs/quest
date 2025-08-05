import { createContext, type ReactNode, useContext, useMemo } from "react";
import { createGatewayClient } from "@/lib/api";

interface ApiContextValue {
	client: ReturnType<typeof createGatewayClient>;
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
	baseUrl?: string;
}

export function ApiProvider({
	children,
	baseUrl: apiBaseUrl,
}: ApiProviderProps) {
	const baseUrl = useMemo(() => apiBaseUrl ?? getApiConfig(), [apiBaseUrl]);

	const client = useMemo(
		() => createGatewayClient(baseUrl, "quest"),
		[baseUrl],
	);

	const value = useMemo(
		() => ({
			client,
			baseUrl,
		}),
		[client, baseUrl],
	);

	return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi() {
	const context = useContext(ApiContext);
	if (!context) {
		throw new Error("useApi must be used within an ApiProvider");
	}

	return context;
}

// Convenience hook
export function useApiClient() {
	return useApi().client;
}
