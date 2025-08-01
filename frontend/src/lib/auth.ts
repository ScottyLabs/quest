import { redirect } from "@tanstack/react-router";
import createFetchClient from "openapi-fetch";
import type { components, paths } from "@/lib/schema.gen";

export interface AuthContext {
	isAuthenticated: boolean;
	user: components["schemas"]["UserProfileResponse"];
}

// Create a fetch client for auth checks
function createAuthFetchClient(baseUrl: string) {
	return createFetchClient<paths>({
		baseUrl,
		credentials: "include",
	});
}

// Auth middleware function
export async function requireAuth(baseUrl: string) {
	const fetchClient = createAuthFetchClient(baseUrl);

	try {
		const { data, error } = await fetchClient.GET("/api/profile");

		if (data && !error) {
			return { isAuthenticated: true, user: data } as AuthContext;
		} else {
			throw redirect({
				to: "/login",
				search: { from: window.location.pathname },
			});
		}
	} catch {
		// If API call fails, redirect to login
		throw redirect({
			to: "/login",
			search: { from: window.location.pathname },
		});
	}
}

// Redirect if already authenticated
export async function redirectIfAuthenticated(baseUrl: string) {
	const fetchClient = createAuthFetchClient(baseUrl);

	try {
		const { data, error } = await fetchClient.GET("/api/profile");

		if (data && !error) {
			// User is authenticated, redirect
			const urlParams = new URLSearchParams(window.location.search);
			const from = urlParams.get("from") || "/";

			throw redirect({ to: from });
		}
	} catch {
		// User is not authenticated, allow access to login page
	}
}
