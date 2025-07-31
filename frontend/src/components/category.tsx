import { Link } from "@tanstack/react-router";
import type { AuthContext } from "@/lib/auth";
import {
	type CategoryId,
	categories,
	categoryLabels,
	categoryRoutes,
	colorClasses,
} from "@/lib/categories";

type CategoryProps = {
	categoryId: CategoryId;
	user: AuthContext["user"];
};

export function ChallengeCategory({ categoryId, user }: CategoryProps) {
	const colors = colorClasses[categoryId];

	return (
		<div className={colors.secondary}>
			<h1 className={colors.text}>{categoryLabels[categoryId]}</h1>
			<p>
				Welcome to the {categoryLabels[categoryId]} challenges, {user.name}.
			</p>

			<div className="flex gap-2">
				{categories.map((category) => (
					<Link
						key={category.id}
						to={categoryRoutes[category.id]}
						className="[&.active]:font-bold"
					>
						{category.label}
					</Link>
				))}
			</div>
		</div>
	);
}
