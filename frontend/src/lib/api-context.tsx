import { createContext, type ReactNode, useContext, useMemo } from "react";
import { createGatewayClient } from "@/lib/api";

interface ApiContextValue {
	client: ReturnType<typeof createGatewayClient>;
	baseUrl: string;
	serviceName: string;
}

const ApiContext = createContext<ApiContextValue | null>(null);

function getApiConfig() {
	const hostname = window.location.hostname;
	const isDev = hostname === "localhost" || hostname === "127.0.0.1";

	// Dev configuration
	if (isDev) {
		return {
			baseUrl: "http://localhost:3000",
			serviceName: "quest",
		};
	}

	// Production configuration
	if (hostname === "cmu.quest") {
		return {
			baseUrl: "https://api.cmu.quest",
			serviceName: "quest",
		};
	}

	if (hostname === "quest.scottylabs.org") {
		return {
			baseUrl: "https://api.quest.scottylabs.org",
			serviceName: "quest",
		};
	}

	// Fallback to production
	return {
		baseUrl: "https://api.quest.scottylabs.org",
		serviceName: "quest",
	};
}

interface ApiProviderProps {
	children: ReactNode;
	baseUrl?: string;
	serviceName?: string;
}

export function ApiProvider({
	children,
	baseUrl,
	serviceName,
}: ApiProviderProps) {
	const config = useMemo(() => {
		if (baseUrl && serviceName) {
			return { baseUrl, serviceName };
		}
		return getApiConfig();
	}, [baseUrl, serviceName]);

	const client = useMemo(
		() => createGatewayClient(config.baseUrl, config.serviceName),
		[config.baseUrl, config.serviceName],
	);

	const value = useMemo(
		() => ({
			client,
			baseUrl: config.baseUrl,
			serviceName: config.serviceName,
		}),
		[client, config.baseUrl, config.serviceName],
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
