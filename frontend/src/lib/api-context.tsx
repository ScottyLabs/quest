import { createContext, type ReactNode, useContext, useMemo } from "react";
import { createGatewayClient } from "@/lib/api";

interface ApiContextValue {
	client: ReturnType<typeof createGatewayClient>;
	baseUrl: string;
	serviceName: string;
}

const ApiContext = createContext<ApiContextValue | null>(null);

interface ApiProviderProps {
	children: ReactNode;
	baseUrl?: string;
	serviceName?: string;
}

export function ApiProvider({
	children,
	baseUrl = "https://api.quest.scottylabs.org",
	serviceName = "quest",
}: ApiProviderProps) {
	const client = useMemo(
		() => createGatewayClient(baseUrl, serviceName),
		[baseUrl, serviceName],
	);

	const value = useMemo(
		() => ({
			client,
			baseUrl,
			serviceName,
		}),
		[client, baseUrl, serviceName],
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
