import { ChallengeCard } from "@/components/challenges/card";
import { useFilterContext } from "@/components/challenges/filter-layout";
import { useChallengesByCategory } from "@/components/challenges/layout";
import type { AuthContext } from "@/lib/auth";
import type { CategoryId } from "@/lib/data/categories";

type CategoryProps = {
	categoryId: CategoryId;
	user: AuthContext["user"];
};

export function ChallengeCategory({ categoryId }: CategoryProps) {
	const { challenges } = useChallengesByCategory(categoryId);
	const { selectedFilter } = useFilterContext();

	// TODO: remove this in prod
	challenges.forEach((challenge) => {
		const rand = Math.random();
		challenge.status =
			rand < 0.3 ? "completed" : rand < 0.6 ? "locked" : "available";
	});

	const filtered = challenges.filter(
		(challenge) =>
			selectedFilter === "all" || challenge.status === selectedFilter,
	);

	return (
		<div className="px-4 pt-6 max-w-xl mx-auto [view-transition-name:main-content] flex flex-col gap-4">
			{filtered.map((challenge, index) => (
				<ChallengeCard
					key={challenge.name}
					challenge={challenge}
					categoryId={categoryId}
					isLast={index === filtered.length - 1}
				/>
			))}
		</div>
	);
}
