import { createFileRoute, notFound } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { type Challenge, ChallengeCard } from "@/components/challenges/card";
import type { FilterOption } from "@/components/challenges/filter-card";
import { useFilter } from "@/components/challenges/filter-context";
import { PageLayout } from "@/components/page-layout";
import { useApi } from "@/lib/api-context";
import { requireAuth } from "@/lib/auth";
import {
	type CategoryId,
	type CategoryLabel,
	categoryIdFromLabel,
	colorClasses,
} from "@/lib/data/categories";

export const Route = createFileRoute("/challenges/$categoryId")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context);
	},
	params: {
		parse: (params) => {
			if (!(params.categoryId in colorClasses)) {
				// It's not a valid CategoryId
				throw notFound();
			}

			return { categoryId: params.categoryId };
		},
	},
	component: RouteComponent,
});

function useFilteredChallenges(
	challenges: Challenge[],
	filter: FilterOption,
	categoryId: string,
) {
	return useMemo(() => {
		return challenges.filter((challenge) => {
			// Apply status filter
			if (filter !== "all" && challenge.status !== filter) return false;

			// Apply category filter
			if (categoryId !== "all") {
				const thisId = categoryIdFromLabel[challenge.category as CategoryLabel];
				if (thisId !== categoryId) return false;
			}

			return true;
		});
	}, [challenges, filter, categoryId]);
}

function RouteComponent() {
	const { user } = Route.useRouteContext();
	const { categoryId } = Route.useParams();

	const { filter } = useFilter();

	// TODO: make this /api/challenges in prod
	const { $api } = useApi();
	const { data, refetch } = $api.useQuery("get", "/api/admin/challenges");

	// TODO: remove this in prod (mock status assignment)
	const challenges = useMemo(() => {
		const baseChallenges = data?.challenges ?? [];

		return baseChallenges.map((challenge) => {
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

	const filtered = useFilteredChallenges(challenges, filter, categoryId);

	// Refresh the challenges data to reflect the completion
	const handleChallengeComplete = useCallback(() => refetch(), [refetch]);

	return (
		<PageLayout
			currentPath="/challenges/$categoryId"
			categoryId={categoryId as CategoryId}
			user={user}
		>
			<div className="px-4 pt-6 max-w-xl mx-auto [view-transition-name:main-content] flex flex-col gap-4">
				{filtered.map((challenge, index) => (
					<ChallengeCard
						key={challenge.name}
						challenge={challenge}
						isLast={index === filtered.length - 1}
						onChallengeComplete={handleChallengeComplete}
					/>
				))}
			</div>
		</PageLayout>
	);
}
