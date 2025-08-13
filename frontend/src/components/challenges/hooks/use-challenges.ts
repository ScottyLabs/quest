import { useMemo } from "react";
import type { Challenge } from "@/components/challenges";
import { useApi, useAppContext } from "@/lib/app-context";
import {
	type CategoryId,
	type CategoryLabel,
	categoryIdFromLabel,
} from "@/lib/data/categories";

interface UseChallengesOptions {
	searchQuery: string;
	categoryId?: CategoryId;
	mode?: "challenges" | "verify";
}

// Stable hash function for consistent status assignment
function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // convert to 32-bit integer
	}
	return Math.abs(hash);
}

export function useChallenges({
	searchQuery,
	categoryId,
	mode = "challenges",
}: UseChallengesOptions) {
	const { filter } = useAppContext();
	const { $api } = useApi();
	const { data, isLoading } = $api.useQuery("get", "/api/admin/challenges");

	const normalizedSearchQuery = useMemo(
		() => searchQuery.toLowerCase().trim(),
		[searchQuery],
	);

	const filteredChallenges = useMemo(() => {
		const challenges = data?.challenges ?? [];

		// Apply all filters
		return challenges.reduce((acc, challenge) => {
			// Assign status deterministically based on challenge name
			// TODO: Remove this mock status assignment in prod
			const hash = hashString(challenge.name);
			const status = hash % 2 ? ("locked" as const) : ("available" as const);

			const processedChallenge = { ...challenge, status };

			// Apply status filter (only for challenges mode)
			if (mode === "challenges" && filter !== "all" && status !== filter)
				return acc;

			// Apple category filter
			if (categoryId && categoryId !== "all") {
				const thisId = categoryIdFromLabel[challenge.category as CategoryLabel];
				if (thisId !== categoryId) return acc;
			}

			// Apply search filter
			if (normalizedSearchQuery) {
				if (
					!`${challenge.name} ${challenge.tagline} ${challenge.description}`
						.toLowerCase()
						.includes(normalizedSearchQuery)
				)
					return acc;
			}

			acc.push(processedChallenge);
			return acc;
		}, [] as Challenge[]);
	}, [categoryId, data?.challenges, filter, mode, normalizedSearchQuery]);

	return {
		challenges: filteredChallenges,
		isLoading,
	};
}
