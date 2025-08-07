import { ChallengeCard } from "@/components/challenges/card";
import { useChallengesByCategory } from "@/components/challenges/layout";
import type { AuthContext } from "@/lib/auth";
import type { CategoryId } from "@/lib/data/categories";

type CategoryProps = {
	categoryId: CategoryId;
	user: AuthContext["user"];
};

export function ChallengeCategory({ categoryId }: CategoryProps) {
	const { challenges } = useChallengesByCategory(categoryId);

	return (
		<div className="px-4 pt-6 max-w-xl mx-auto pb-32 [view-transition-name:main-content] flex flex-col gap-4">
			{challenges.map((challenge, index) => (
				<ChallengeCard
					key={challenge.name}
					challenge={challenge}
					categoryId={categoryId}
					isLast={index === challenges.length - 1}
				/>
			))}
		</div>
	);
}
