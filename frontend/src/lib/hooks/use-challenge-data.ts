import { useApi } from "@/lib/api-context";
import type { ChallengeData } from "@/lib/types";
import { snakeToCamelObject } from "@/lib/utils";
import type { components } from "../schema.gen";

// Use OpenAPI types
type ChallengesListResponse = components["schemas"]["ChallengesListResponse"];
type ChallengeResponse = components["schemas"]["ChallengeResponse"];
type ChallengeDetails = components["schemas"]["ChallengeDetails"];
export function useChallengeData() {
	const { $api } = useApi();

	const query = $api.useQuery("get", "/api/challenges");

	if (query.isError) {
		console.error("Error fetching challenge data:", query.error);
	}

	// Transform the data when it's available
	const transformedData = (() => {
		if (!query.data?.challenges) {
			return null;
		}

		// Group challenges by category and calculate stats
		const categoryMap = new Map<string, { completed: number; total: number }>();

		query.data.challenges.forEach((challenge: ChallengeResponse) => {
			// Handle the union type - challenge can be null or ChallengeDetails
			if (!challenge) return;

			const category = challenge.category || "Unknown";
			const isCompleted = challenge.status === "completed";

			const current = categoryMap.get(category) || {
				completed: 0,
				total: 0,
			};
			current.total += 1;
			if (isCompleted) {
				current.completed += 1;
			}
			categoryMap.set(category, current);
		});

		// Convert to ChallengeData format
		const categories = Array.from(categoryMap.entries()).map(
			([name, stats]) => ({
				name,
				completed: stats.completed,
				total: stats.total,
				color: getCategoryColor(name),
				flagColor: getCategoryColor(name),
			}),
		);

		const totalCompleted = Array.from(categoryMap.values()).reduce(
			(sum, stats) => sum + stats.completed,
			0,
		);
		const totalChallenges = Array.from(categoryMap.values()).reduce(
			(sum, stats) => sum + stats.total,
			0,
		);

		return {
			categories,
			totalCompleted,
			totalChallenges,
		} as ChallengeData;
	})();

	return {
		data: transformedData,
		loading: query.isLoading,
		error: query.isError ? "Failed to load challenge data" : null,
	};
}

// New hook to get all challenges as individual challenge objects (user endpoint - no secrets)
export function useAllChallenges() {
	const { $api } = useApi();

	const query = $api.useQuery("get", "/api/challenges");

	if (query.isError) {
		console.error("Error fetching challenges:", query.error);
	}

	// Transform the data when it's available
	const transformedData =
		query.data?.challenges
			?.filter(
				(challenge): challenge is ChallengeResponse & ChallengeDetails =>
					challenge !== null && challenge.category !== undefined,
			)
			?.map((challenge) => {
				// Convert snake_case to camelCase using the utility function
				const camelCaseChallenge = snakeToCamelObject(challenge);
				return {
					name: camelCaseChallenge.name,
					category: camelCaseChallenge.category,
					location: camelCaseChallenge.location,
					secret: "", // Secret is not exposed in user endpoint
					scotty_coins:
						camelCaseChallenge.scottyCoins || challenge.scotty_coins,
					tagline: camelCaseChallenge.tagline,
					description: camelCaseChallenge.description,
					maps_link: camelCaseChallenge.mapsLink || challenge.maps_link,
					more_info_link:
						camelCaseChallenge.moreInfoLink || challenge.more_info_link,
					unlock_timestamp:
						camelCaseChallenge.unlockTimestamp || challenge.unlock_timestamp,
					status: camelCaseChallenge.status,
					completed_at:
						camelCaseChallenge.completedAt || challenge.completed_at,
				};
			}) || [];

	// Debug logging
	console.log("Query data:", query.data);
	console.log("Transformed data:", transformedData);

	return {
		data: transformedData,
		loading: query.isLoading,
		error: query.isError ? "Failed to load challenges" : null,
		// Debug: Log the query state
		debug: {
			isLoading: query.isLoading,
			isError: query.isError,
			error: query.error,
			data: query.data,
		},
	};
}

// New hook to get all challenges with secrets (admin endpoint - for QR code generation)
export function useAllChallengesWithSecrets() {
	const { $api } = useApi();

	const query = $api.useQuery("get", "/api/admin/challenges");

	if (query.isError) {
		console.error("Error fetching challenges with secrets:", query.error);
	}

	// Transform the data when it's available
	const transformedData = (() => {
		// Debug: Log the raw response structure
		console.log("Raw query.data:", query.data);
		console.log("query.data type:", typeof query.data);
		console.log("query.data.challenges:", query.data?.challenges);
		console.log("challenges type:", typeof query.data?.challenges);
		console.log("Is challenges array?", Array.isArray(query.data?.challenges));

		// Handle different possible response structures
		let challengesArray: any[] = [];

		if (Array.isArray(query.data?.challenges)) {
			// Expected structure: { challenges: [...] }
			challengesArray = query.data.challenges;
		} else if (Array.isArray(query.data)) {
			// Direct array response
			challengesArray = query.data;
		} else if (
			query.data &&
			typeof query.data === "object" &&
			!Array.isArray(query.data)
		) {
			// Single challenge object
			challengesArray = [query.data];
		} else {
			// No data or unexpected structure
			challengesArray = [];
		}

		console.log("Processed challengesArray:", challengesArray);

		return challengesArray.map((challenge) => {
			// Convert snake_case to camelCase using the utility function
			const camelCaseChallenge = snakeToCamelObject(challenge);
			return {
				name: camelCaseChallenge.name,
				category: camelCaseChallenge.category,
				location: camelCaseChallenge.location,
				secret: camelCaseChallenge.secret, // Secret is available in admin endpoint
				scotty_coins: camelCaseChallenge.scottyCoins || challenge.scotty_coins,
				tagline: camelCaseChallenge.tagline,
				description: camelCaseChallenge.description,
				maps_link: camelCaseChallenge.mapsLink || challenge.maps_link,
				more_info_link:
					camelCaseChallenge.moreInfoLink || challenge.more_info_link,
				unlock_timestamp:
					camelCaseChallenge.unlockTimestamp || challenge.unlock_timestamp,
				status: "available" as const, // Admin endpoint doesn't include status, default to available
				completed_at: null, // Admin endpoint doesn't include completion status
			};
		});
	})();

	// Debug logging
	console.log("Admin query data:", query.data);
	console.log("Transformed data with secrets:", transformedData);

	return {
		data: transformedData,
		loading: query.isLoading,
		error: query.isError ? "Failed to load challenges with secrets" : null,
		// Debug: Log the query state
		debug: {
			isLoading: query.isLoading,
			isError: query.isError,
			error: query.error,
			data: query.data,
		},
	};
}

// New hook for verify page - transforms admin challenges to Challenge type
export function useAdminChallengesForVerify() {
	const { $api } = useApi();

	const query = $api.useQuery("get", "/api/admin/challenges");

	if (query.isError) {
		console.error("Error fetching admin challenges:", query.error);
	}

	// Transform the data when it's available
	const transformedData = (() => {
		if (!query.data?.challenges) {
			return [];
		}

		return query.data.challenges.map(
			(challenge: components["schemas"]["Model"], index: number) => ({
				id: index,
				name: challenge.name,
				description: challenge.description,
				location: challenge.location,
				coins_earned_for_completion: challenge.scotty_coins,
				completed: false, // Admin view doesn't track completion status
				unlocked: true, // Admin view shows all challenges as unlocked
				unlock_date: new Date(challenge.unlock_timestamp).toLocaleDateString(),
				category: challenge.category as any,
			}),
		);
	})();

	return {
		data: transformedData,
		loading: query.isLoading,
		error: query.isError ? "Failed to load admin challenges" : null,
	};
}

// New hook for corners page - returns only essential fields (category, location, secret, name)
export function useAdminChallengesForCorners() {
	const { $api } = useApi();

	const query = $api.useQuery("get", "/api/admin/challenges");

	if (query.isError) {
		console.error("Error fetching admin challenges for corners:", query.error);
	}

	// Transform the data when it's available
	const transformedData = (() => {
		if (!query.data?.challenges) {
			return [];
		}

		return query.data.challenges.map(
			(challenge: components["schemas"]["Model"], index: number) => ({
				...challenge, // Return the full Model type
				id: index, // Add id for React keys
			}),
		);
	})();

	return {
		data: transformedData,
		loading: query.isLoading,
		error: query.isError ? "Failed to load admin challenges" : null,
	};
}

// Helper function to get category colors
function getCategoryColor(categoryName: string): string {
	const colorMap: Record<string, string> = {
		"The Essentials": "#D7263D",
		"Let's Eat": "#F9A602",
		"Corners of Carnegie": "#1FAA59",
		"Campus of Bridges": "#119DA4",
		"Minor-Major Generals": "#0C356A",
		"Off-Campus": "#6C2EB7",
	};

	return colorMap[categoryName] || "#C8102E"; // Carnegie Red
}
