import createClient from "openapi-fetch";
import type { components, paths } from "./schema.gen";

const client = createClient<paths>({
	baseUrl: import.meta.env.VITE_API_URL || "http://localhost:3000",
});

// Use OpenAPI types
export type ChallengeData = components["schemas"]["ChallengeResponse"];
export type ChallengeStatus = components["schemas"]["ChallengeStatus"];
export type ChallengeSecret = components["schemas"]["Model"];
export async function fetchChallenges(): Promise<ChallengeData[]> {
	try {
		const { data, error } = await client.GET("/api/challenges");

		if (error) {
			console.error("Error fetching challenges:", error);
			throw new Error("Failed to fetch challenges");
		}

		if (!data?.challenges) {
			throw new Error("No challenges data received");
		}

		// Return the data directly since it matches our OpenAPI schema
		return data.challenges;
	} catch (error) {
		console.error("Error fetching challenges:", error);
		throw error;
	}
}
