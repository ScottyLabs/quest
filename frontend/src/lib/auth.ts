import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import createFetchClient from "openapi-fetch";
import type { components, paths } from "@/lib/schema.gen";
import type { RouterContext } from "@/routes/__root";

export interface AuthContext {
	isAuthenticated: boolean;
	user: components["schemas"]["UserProfileResponse"];
}

// Auth middleware function
export async function requireAuth({ baseUrl, queryClient }: RouterContext) {
	const queryKey = ["get", "/api/profile", {}];
	const fetchClient = createFetchClient<paths>({
		baseUrl,
		credentials: "include",
	});

	try {
		// Check cache first
		const cachedData = queryClient.getQueryData(queryKey);
		if (cachedData) {
			const user = cachedData as components["schemas"]["UserProfileResponse"];
			const authContext = { isAuthenticated: true, user };

			return handleAuthSuccess(authContext);
		}

		const data = await queryClient.fetchQuery({
			queryKey,
			queryFn: async () => {
				const response = await fetchClient.GET("/api/profile");
				if (response.error) throw new Error("Failed to fetch profile");

				return response.data;
			},
		});

		if (data) {
			const authContext = { isAuthenticated: true, user: data };
			return handleAuthSuccess(authContext);
		} else {
			throw new Error("No profile data");
		}
	} catch (error) {
		queryClient.removeQueries({ queryKey });

		if (error && typeof error === "object" && "options" in error) {
			// It's a redirect, re-throw it
			throw error;
		}

		throw redirect({
			to: "/login",
			search: { from: window.location.pathname },
		});
	}
}

export async function adminMiddleware(context: RouterContext) {
	const authContext = await requireAuth(context);

	// Check if user is in the admin group
	if (
		!authContext.user.groups.includes("O-Quest Admin") &&
		window.location.pathname === "/verify"
	) {
		throw redirect({ to: "/terrier-trade" });
	} else if (
		authContext.user.groups.includes("O-Quest Admin") &&
		window.location.pathname === "/terrier-trade"
	) {
		throw redirect({ to: "/verify" });
	}

	return authContext;
}

// Redirect if already authenticated
export async function redirectIfAuthenticated({
	baseUrl,
	queryClient,
}: RouterContext) {
	const queryKey = ["get", "/api/profile", {}];
	const fetchClient = createFetchClient<paths>({
		baseUrl,
		credentials: "include",
	});

	try {
		// Check cache first
		const cachedData = queryClient.getQueryData(queryKey);
		if (cachedData) {
			const user = cachedData as components["schemas"]["UserProfileResponse"];
			return handleRedirectLogic(user);
		}

		const data = await queryClient.fetchQuery({
			queryKey,
			queryFn: async () => {
				const response = await fetchClient.GET("/api/profile");
				if (response.error) throw new Error("Failed to fetch profile");

				return response.data;
			},
		});

		if (data) {
			return handleRedirectLogic(data);
		}
	} catch (error) {
		if (error && typeof error === "object" && "options" in error) {
			// It's a redirect, re-throw it
			throw error;
		}
	}
}

function handleAuthSuccess(authContext: AuthContext): AuthContext {
	const { user } = authContext;

	// if (user.dorm && window.location.pathname === "/dorm-select") {
	// 	const urlParams = new URLSearchParams(window.location.search);
	// 	const from = urlParams.get("from") || "/";
	// 	throw redirect({ to: from });
	// }

	// if (!user.dorm && window.location.pathname !== "/dorm-select") {
	// 	throw redirect({
	// 		to: "/dorm-select",
	// 		search: { from: window.location.pathname },
	// 	});
	// }

	return authContext;
}

function handleRedirectLogic(
	user: components["schemas"]["UserProfileResponse"],
) {
	if (!user.dorm) {
		throw redirect({
			to: "/dorm-select",
			search: { from: window.location.pathname },
		});
	}

	// User is authenticated and has a dorm, redirect
	const urlParams = new URLSearchParams(window.location.search);
	const from = urlParams.get("from") || "/";

	throw redirect({ to: from });
}

// Call alongside logout
export function clearAuthCache(queryClient: QueryClient) {
	queryClient.removeQueries({
		predicate: (query) =>
			query.queryKey[0] === "get" && query.queryKey[1] === "/api/profile",
	});
}
