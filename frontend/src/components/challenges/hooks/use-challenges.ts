import { useMemo } from "react";
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
	const { data, isLoading } = $api.useQuery("get", "/api/admin/challenges");

	// Base challenges with mock status assignment (TODO: remove in prod)
	const baseChallenges = useMemo(() => {
		const challenges = data?.challenges ?? [];

		return challenges.map((challenge) => {
			const rand = Math.random();
			return {
				...challenge,
				status:
					rand < 0.3
						? ("completed" as const)
						: rand < 0.6
							? ("locked" as const)
							: ("available" as const),
			};
		});
	}, [data?.challenges]);

	// Apply all filters
	const filteredChallenges = useMemo(() => {
		return baseChallenges.filter((challenge) => {
			// Apply status filter (only for challenges mode)
			if (
				mode === "challenges" &&
				filter !== "all" &&
				challenge.status !== filter
			) {
				return false;
			}

			// Apply category filter
			if (categoryId && categoryId !== "all") {
				const thisId = categoryIdFromLabel[challenge.category as CategoryLabel];
				if (thisId !== categoryId) return false;
			}

			// Apply search filter
			if (!searchQuery.trim()) return true;

			return (
				challenge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				challenge.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
				challenge.description.toLowerCase().includes(searchQuery.toLowerCase())
			);
		});
	}, [baseChallenges, filter, categoryId, searchQuery, mode]);

	return {
		challenges: filteredChallenges,
		isLoading,
	};
}
