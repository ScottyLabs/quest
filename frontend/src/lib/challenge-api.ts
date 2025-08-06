import createClient from "openapi-fetch";
import type { paths } from "./schema.gen";

const client = createClient<paths>({
	baseUrl: import.meta.env.VITE_API_URL || "http://localhost:3000",
});

export interface ChallengeData {
	name: string;
	category: string;
	location: string;
	secret: string;
	scotty_coins: number;
	tagline: string;
	description: string;
	maps_link?: string | null;
	more_info_link?: string | null;
	unlock_timestamp: string;
	status: "locked" | "available" | "completed";
	completed_at?: string | null;
}

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

		// Transform the data to match our interface
		return data.challenges.map((challenge: any) => ({
			name: challenge.name,
			category: challenge.details?.category || "Unknown",
			location: challenge.details?.location || "Unknown",
			secret: "", // Secret is not exposed in the public API
			scotty_coins: challenge.details?.scotty_coins || 0,
			tagline: challenge.details?.tagline || "",
			description: challenge.details?.description || "",
			maps_link: challenge.details?.maps_link,
			more_info_link: challenge.details?.more_info_link,
			unlock_timestamp: challenge.unlock_timestamp,
			status: challenge.status,
			completed_at: challenge.completed_at,
		}));
	} catch (error) {
		console.error("Error fetching challenges:", error);
		throw error;
	}
}
