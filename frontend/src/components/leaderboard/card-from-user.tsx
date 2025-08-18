import { LeaderboardCard } from "@/components/leaderboard/card";
import type { ValidPath } from "@/lib/data/page";
import type { components } from "@/lib/schema.gen";

interface CardFromUserProps {
	user?: components["schemas"]["UserProfileResponse"];
	to: ValidPath;
}

export function CardFromUser({ user, to }: CardFromUserProps) {
	return (
		<LeaderboardCard
			// The entry is not loaded, so construct it manually from user
			entry={{
				challenges_completed: user?.challenges_completed.total ?? 0,
				coins_earned: user?.scotty_coins.total_earned ?? 0,
				coins_spent: user?.scotty_coins.total_spent ?? 0,
				dorm: user?.dorm,
				// If there is no name for some reason, defaulting to "You"
				// will also ensure that the italic "(You)" is not added too
				name: user?.andrew_id ?? "You",
				rank: user?.leaderboard_position ?? Infinity,
				user_id: user?.user_id ?? "No user ID",
			}}
			name={user?.andrew_id}
			totalChallenges={user?.total_challenges.total ?? 0}
			to={to}
		/>
	);
}
