import { createFileRoute, notFound } from "@tanstack/react-router";
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

	// TODO: make this /api/challenges in prod
	const { $api } = useApi();
	const { data } = $api.useQuery("get", "/api/admin/challenges");

	const challenges = data?.challenges ?? [];

	// TODO: remove this in prod
	challenges.forEach((challenge) => {
		const rand = Math.random();
		challenge.status =
			rand < 0.3 ? "completed" : rand < 0.6 ? "locked" : "available";
	});

	const filtered = challenges
		.filter((challenge) => filter === "all" || challenge.status === filter)
		.filter(
			(challenge) =>
				categoryId === "all" ||
				categoryIdFromLabel[challenge.category as CategoryLabel] === categoryId,
		);

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
						isLast={index === challenges.length - 1}
					/>
				))}
			</div>
		</PageLayout>
	);
}
