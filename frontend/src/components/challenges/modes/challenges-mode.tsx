import { Loader2 } from "lucide-react";
import {
	type Challenge,
	ChallengesList,
	useChallenges,
} from "@/components/challenges";
import type { CategoryId } from "@/lib/data/categories";

interface ChallengesModeProps {
	categoryId: CategoryId;
	searchQuery: string;
	setChallenge: (challenge: Challenge) => void;
	setOpen: (open: boolean) => void;
}

export function ChallengesMode({
	categoryId,
	searchQuery,
	setChallenge,
	setOpen,
}: ChallengesModeProps) {
	const { challenges, isLoading } = useChallenges({
		searchQuery,
		categoryId,
		mode: "challenges",
	});

	// Show loading state for initial load
	if (isLoading && challenges.length === 0) {
		return (
			<div className="flex justify-center py-8">
				<Loader2 className="animate-spin text-gray-400 size-8" />
			</div>
		);
	}

	return (
		<ChallengesList
			challenges={challenges}
			searchQuery={searchQuery}
			isVerifyMode={false}
			emptyMessage="No challenges currently available"
			setChallenge={setChallenge}
			setOpen={setOpen}
		/>
	);
}
