import { redirect } from "@tanstack/react-router";
import createFetchClient from "openapi-fetch";
import type { components, paths } from "@/lib/schema.gen";

export interface AuthContext {
	isAuthenticated: boolean;
	user: components["schemas"]["UserProfileResponse"];
}

// Auth middleware function
export async function requireAuth(baseUrl: string) {
	const fetchClient = createFetchClient<paths>({
		baseUrl,
		credentials: "include",
	});

	try {
		const { data, error } = await fetchClient.GET("/api/profile");

		if (data && !error) {
			const authContext = { isAuthenticated: true, user: data } as AuthContext;

			// If user has a dorm set, redirect away from dorm selection page
			if (data.dorm && window.location.pathname === "/dorm-select") {
				const urlParams = new URLSearchParams(window.location.search);
				const from = urlParams.get("from") || "/";

				throw redirect({ to: from });
			}

			// Redirect to dorm selection for all other pages
			if (!data.dorm && window.location.pathname !== "/dorm-select") {
				throw redirect({
					to: "/dorm-select",
					search: { from: window.location.pathname },
				});
			}

			return authContext;
		} else {
			throw redirect({
				to: "/login",
				search: { from: window.location.pathname },
			});
		}
	} catch (error) {
		if (error && typeof error === "object" && "options" in error) {
			// It's a redirect, re-throw it
			throw error;
		}

		// The API call failed, redirect to login
		throw redirect({
			to: "/login",
			search: { from: window.location.pathname },
		});
	}
}

// Redirect if already authenticated
export async function redirectIfAuthenticated(baseUrl: string) {
	const fetchClient = createFetchClient<paths>({
		baseUrl,
		credentials: "include",
	});

	try {
		const { data, error } = await fetchClient.GET("/api/profile");

		if (data && !error) {
			// User is authenticated, but did not select a dorm
			if (!data.dorm) {
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
	} catch (error) {
		if (error && typeof error === "object" && "options" in error) {
			// It's a redirect, re-throw it
			throw error;
		}

		// The API call failed, do nothing
	}
}
