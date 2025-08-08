import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useApi } from "@/lib/api-context";
import { type CategoryId, categoryLabelFromId } from "@/lib/data/categories";
import type { components } from "@/lib/schema.gen";

// TODO: this has to be changed when the query becomes /api/challenges in prod
export type Challenge = components["schemas"]["AdminChallengeResponse"];

interface ChallengesContextType {
	challenges: Challenge[];
	isLoading: boolean;
}

const ChallengesContext = createContext<ChallengesContextType | null>(null);

export function ChallengesLayout({ children }: { children: ReactNode }) {
	const { $api } = useApi();
	const { data, isLoading } = $api.useQuery("get", "/api/admin/challenges");

	return (
		<ChallengesContext.Provider
			value={{
				challenges: data?.challenges ?? [],
				isLoading,
			}}
		>
			{children}
		</ChallengesContext.Provider>
	);
}

function useChallengesContext() {
	const context = useContext(ChallengesContext);
	if (!context) {
		throw new Error(
			"useChallengesContext must be used within ChallengesLayout",
		);
	}

	return context;
}

export function useChallengesByCategory(categoryId: CategoryId) {
	const { challenges: allChallenges, isLoading } = useChallengesContext();

	const challenges = useMemo(
		() =>
			categoryId === "all"
				? allChallenges
				: allChallenges.filter(
						(c) => c.category === categoryLabelFromId[categoryId],
					),
		[allChallenges, categoryId],
	);

	return { challenges, isLoading };
}
