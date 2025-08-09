import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageLayout } from "@/components/page-layout";
import { VerificationList } from "@/components/verify/verification-card";
import { useApi } from "@/lib/api-context";
import { adminMiddleware } from "@/lib/auth";
import {
	type CategoryId,
	type CategoryLabel,
	categories,
	categoryIdFromLabel,
	colorClasses,
} from "@/lib/data/categories";

export const Route = createFileRoute("/verify")({
	beforeLoad: async ({ context }) => {
		return await adminMiddleware(context);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { user } = Route.useRouteContext();
	const { $api } = useApi();
	const [selectedCategory, setSelectedCategory] = useState<CategoryId>("all");

	// Fetch challenges data
	const { data, isLoading, error } = $api.useQuery(
		"get",
		"/api/admin/challenges",
	);

	// Filter challenges by selected category
	const filteredChallenges = useMemo(() => {
		const challenges = data?.challenges ?? [];

		if (selectedCategory === "all") {
			return challenges;
		}

		return challenges.filter((challenge) => {
			// Use the same category mapping as the challenge cards
			const thisId = categoryIdFromLabel[challenge.category as CategoryLabel];
			return thisId === selectedCategory;
		});
	}, [data?.challenges, selectedCategory]);

	// Handle loading state
	if (isLoading) {
		return (
			<PageLayout currentPath="/verify" user={user}>
				<div className="[view-transition-name:main-content]">
					<div className="p-4 max-w-xl mx-auto">
						<div className="text-center">Loading challenges...</div>
					</div>
				</div>
			</PageLayout>
		);
	}

	// Handle error state
	if (error) {
		return (
			<PageLayout currentPath="/verify" user={user}>
				<div className="[view-transition-name:main-content]">
					<div className="p-4 max-w-xl mx-auto">
						<div className="text-center text-red-500">
							Error loading challenges. Please try again.
						</div>
					</div>
				</div>
			</PageLayout>
		);
	}

	return (
		<PageLayout currentPath="/verify" user={user}>
			<div className="[view-transition-name:main-content]">
				<div className="p-4 max-w-xl mx-auto">
					{/* Category navigation tabs */}
					<div className="flex flex-row px-4 mt-4 w-full mb-6 overflow-x-auto [scrollbar-width:none]">
						<div className="flex gap-2 flex-nowrap">
							{categories.map((category) => {
								// Get the color for the selected category
								const categoryColors = colorClasses[category.id];
								const isSelected = selectedCategory === category.id;

								return (
									<button
										key={category.label}
										type="button"
										onClick={() => setSelectedCategory(category.id)}
										className={`px-3 py-1 text-white font-bold text-nowrap rounded-md text-sm transition-colors flex-shrink-0 ${
											isSelected
												? categoryColors.selected
												: "hover:bg-default hover:bg-opacity-50"
										}`}
									>
										{category.label}
									</button>
								);
							})}
						</div>
					</div>

					<VerificationList challenges={filteredChallenges} />
				</div>
			</div>
		</PageLayout>
	);
}
