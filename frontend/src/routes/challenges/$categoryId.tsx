import { createFileRoute, notFound } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ChallengeCard } from "@/components/challenges/card";
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

function RouteComponent() {
	const { user } = Route.useRouteContext();
	const { categoryId } = Route.useParams();

	const { filter } = useFilter();
	const [searchQuery, setSearchQuery] = useState("");

	// TODO: make this /api/challenges in prod
	const { $api } = useApi();
	const { data } = $api.useQuery("get", "/api/admin/challenges");

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

	const filtered = useMemo(() => {
		return challenges.filter((challenge) => {
			// Apply status filter
			if (filter !== "all" && challenge.status !== filter) return false;

			// Apply category filter
			if (categoryId !== "all") {
				const thisId = categoryIdFromLabel[challenge.category as CategoryLabel];
				if (thisId !== categoryId) return false;
			}

			// Apply search filter
			return (
				challenge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				challenge.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
				challenge.description.toLowerCase().includes(searchQuery.toLowerCase())
			);
		});
	}, [challenges, filter, categoryId, searchQuery]);

	return (
		<PageLayout
			currentPath="/challenges/$categoryId"
			categoryId={categoryId as CategoryId}
			user={user}
		>
			<div className="px-4 pt-6 max-w-xl mx-auto [view-transition-name:main-content] flex flex-col gap-4">
				{/* Search Bar */}
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 size-5" />
					<input
						type="text"
						placeholder="Search challenges..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-2xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-default-selected focus:border-transparent"
					/>

					{searchQuery && (
						<X
							onClick={() => setSearchQuery("")}
							className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
						/>
					)}
				</div>

				{/* Results count */}
				{searchQuery && (
					<p className="text-sm text-gray-700">
						{filtered.length === 0
							? "No challenges found"
							: `Found ${filtered.length} challenge${filtered.length === 1 ? "" : "s"}`}
					</p>
				)}

				{filtered.map((challenge, index) => (
					<ChallengeCard
						key={challenge.name}
						challenge={challenge}
						isLast={index === filtered.length - 1}
					/>
				))}

				{/* Empty state */}
				{filtered.length === 0 && !searchQuery && (
					<div className="text-center py-8 text-gray-500">
						No challenges currently available
					</div>
				)}
			</div>
		</PageLayout>
	);
}
