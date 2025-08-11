import { type Challenge, ChallengeCard } from "@/components/challenges";

interface ChallengesListProps {
	challenges: Challenge[];
	searchQuery: string;
	isVerifyMode?: boolean;
	emptyMessage?: string;
	setChallenge: (challenge: Challenge) => void;
	setOpen: (open: boolean) => void;
}

export function ChallengesList({
	challenges,
	searchQuery,
	isVerifyMode = false,
	emptyMessage = "No challenges currently available",
	setChallenge,
	setOpen,
}: ChallengesListProps) {
	return (
		<>
			{/* Results count */}
			{searchQuery && (
				<p className="text-sm text-gray-700">
					{challenges.length === 0
						? "No challenges found"
						: `Found ${challenges.length} challenge${challenges.length === 1 ? "" : "s"}`}
				</p>
			)}

			{/* Challenge cards */}
			{challenges.map((challenge, index) => (
				<ChallengeCard
					key={challenge.name}
					challenge={challenge}
					isLast={index === challenges.length - 1}
					onClick={() => {
						setChallenge(challenge);
						setOpen(true);
					}}
					isVerifyMode={isVerifyMode}
				/>
			))}

			{/* Empty state */}
			{challenges.length === 0 && !searchQuery && (
				<div className="text-center py-8 text-gray-500">{emptyMessage}</div>
			)}
		</>
	);
}
