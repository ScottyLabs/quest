import { createFileRoute } from "@tanstack/react-router";
import { Crown, MoreHorizontal } from "lucide-react";
import { LeaderboardCard } from "@/components/leaderboard-card";
import { PageHeader } from "@/components/page-header";
import { useLeaderboard } from "@/lib/hooks/use-leaderboard";
import { useProfileData } from "@/lib/hooks/use-profile";
import type { LeaderboardEntry, UserProfile } from "@/lib/types";

export const Route = createFileRoute("/leaderboard")({
	component: Leaderboard,
});

function isCurrentUserInTop10(
	leaderboardData: LeaderboardEntry[] = [],
	currentUser: UserProfile,
) {
	return leaderboardData
		.slice(0, 10)
		.some((u) => u.userId === currentUser.userId);
}

function isCurrentUserLast(
	leaderboardData: LeaderboardEntry[] = [],
	currentUser: UserProfile,
) {
	// Check if the current user's place equals the total number of users
	return (
		leaderboardData[leaderboardData.length - 1]?.userId === currentUser.userId
	);
}

function Leaderboard() {
	const { data: leaderboardData } = useLeaderboard();
	const { data: currentUser } = useProfileData();
	console.log("Leaderboard data:", leaderboardData);
	if (!leaderboardData || !currentUser) {
		return <div>Loading...</div>;
	}

	const inTop10 = isCurrentUserInTop10(leaderboardData, currentUser);
	const isLast = isCurrentUserLast(leaderboardData, currentUser);

	console.log("Is current user in top 10:", inTop10);
	console.log("Is current user last:", isLast);

	return (
		<div className="w-screen mx-auto">
			<PageHeader
				title="Leaderboard"
				icon={<Crown size={40} color="white" />}
			/>
			<div className="bg-white divide-y overflow-hidden">
				{inTop10 ? (
					<>
						{leaderboardData.slice(0, 10).map((leaderboardEntry) => (
							<LeaderboardCard
								key={leaderboardEntry.userId}
								{...leaderboardEntry}
								highlight={leaderboardEntry.userId === currentUser.userId}
							/>
						))}
						{/* Dots separator for more users */}
						<div className="flex items-center justify-center py-2 bg-white text-gray-400 select-none">
							<MoreHorizontal className="h-4 w-4" />
						</div>
					</>
				) : (
					<>
						{leaderboardData.slice(0, 10).map((user) => (
							<LeaderboardCard key={user.userId} {...user} />
						))}
						{/* Dots separator */}
						<div className="flex items-center justify-center py-2 bg-white text-gray-400 select-none">
							<MoreHorizontal className="h-4 w-4" />
						</div>
						{/* Before current user */}
						{leaderboardData.slice(10).map((user) => (
							<LeaderboardCard key={user.userId} {...user} />
						))}
						{/* Dots separator for more users - only show if not last */}
						{!isLast && (
							<div className="flex items-center justify-center py-2 bg-white text-gray-400 select-none">
								<MoreHorizontal className="h-4 w-4" />
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
