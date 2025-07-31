import { createContext, type ReactNode, useContext, useMemo } from "react";
import { createGatewayClient } from "@/lib/api";

interface ApiContextValue {
	client: ReturnType<typeof createGatewayClient>;
	baseUrl: string;
	serviceName: string;
}

const ApiContext = createContext<ApiContextValue | null>(null);

function getApiUrlFromDomain(): string {
	const hostname = window.location.hostname;

	if (hostname === "cmu.quest") {
		return "https://api.cmu.quest";
	}

	if (hostname === "quest.scottylabs.org") {
		return "https://api.quest.scottylabs.org";
	}

	// Default for dev
	return "https://api.quest.scottylabs.org";
}

interface ApiProviderProps {
	children: ReactNode;
	baseUrl?: string;
	serviceName?: string;
}

export function ApiProvider({
	children,
	baseUrl,
	serviceName = "quest",
}: ApiProviderProps) {
	const apiUrl = useMemo(() => {
		return baseUrl || getApiUrlFromDomain();
	}, [baseUrl]);

	const client = useMemo(
		() => createGatewayClient(apiUrl, serviceName),
		[apiUrl, serviceName],
	);

	const value = useMemo(
		() => ({ client, baseUrl: apiUrl, serviceName }),
		[client, apiUrl, serviceName],
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
