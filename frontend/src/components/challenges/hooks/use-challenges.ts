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

export function useChallenges({
	searchQuery,
	categoryId,
	mode = "challenges",
}: UseChallengesOptions) {
	const { filter } = useAppContext();
	const { $api } = useApi();
	const {
		data: adminData,
		isLoading: adminLoading,
		isError: adminError,
	} = $api.useQuery("get", "/api/admin/challenges");

	// const {
	// 	data: adminData,
	// 	isLoading: adminLoading,
	// 	isError: adminError,
	// } = {
	// 	data: undefined,
	// 	isLoading: false,
	// 	isError: false,
	// };

	const { data, isLoading, isError } = $api.useQuery("get", "/api/challenges");

	const normalizedSearchQuery = useMemo(
		() => searchQuery.toLowerCase().trim(),
		[searchQuery],
	);

	const filteredChallenges = useMemo(() => {
		const challenges = adminData?.challenges ?? data?.challenges ?? [];

		// Apply all filters
		return challenges.reduce((acc, challenge) => {
			// Preserve completed status, otherwise assign mock status
			const status = challenge.status;

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
	}, [
		categoryId,
		adminData?.challenges,
		data?.challenges,
		filter,
		mode,
		normalizedSearchQuery,
	]);

	return {
		challenges: filteredChallenges,
		isLoading: adminLoading && isLoading,
		isError: adminError && isError,
	};
}
