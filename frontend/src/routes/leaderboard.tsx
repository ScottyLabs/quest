import { createFileRoute } from "@tanstack/react-router";
import { Crown, MoreHorizontal } from "lucide-react";
import { LeaderboardCard } from "@/components/leaderboard-card";
import { PageHeader } from "@/components/page-header";
import { useLeaderboard } from "@/lib/hooks/use-leaderboard";
import { useProfileData } from "@/lib/hooks/use-profile";
import type {
	LeaderboardEntry,
	LeaderboardUser,
	UserProfile,
} from "@/lib/types";

export const Route = createFileRoute("/leaderboard")({
	component: Leaderboard,
});

// Total number of users in the leaderboard (eventually will be from API)
const TOTAL_USERS = 250;

// Fake leaderboard data
const top10: LeaderboardUser[] = [
	{ place: 1, name: "Jeffrey Wang", andrewId: "andrewid1", points: 100 },
	{ place: 2, name: "Alice Smith", andrewId: "asmith", points: 99 },
	{ place: 3, name: "Bob Lee", andrewId: "blee", points: 97 },
	{ place: 4, name: "Carol Kim", andrewId: "ckim", points: 94 },
	{ place: 5, name: "David Park", andrewId: "dpark", points: 93 },
	{ place: 6, name: "Eve Lin", andrewId: "elin", points: 82 },
	{ place: 7, name: "Frank Zhao", andrewId: "fzhao", points: 76 },
	{ place: 8, name: "Grace Chen", andrewId: "gchen", points: 70 },
	{ place: 9, name: "Henry Wu", andrewId: "hwu", points: 65 },
	{ place: 10, name: "Ivy Xu", andrewId: "ixu", points: 60 },
];

// Simulate current user (change this to test different scenarios)
const currentUser: LeaderboardUser = {
	place: 210,
	name: "Jeffrey Wang",
	andrewId: "andrewid",
	points: 33,
};
const beforeCurrent: LeaderboardUser = {
	place: 209,
	name: "Sam Lee",
	andrewId: "slee",
	points: 34,
};
const afterCurrent: LeaderboardUser = {
	place: 211,
	name: "Tina Ho",
	andrewId: "tho",
	points: 32,
};

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
		<div className="max-w-md mx-auto">
			<PageHeader
				title="Leaderboard"
				icon={<Crown size={40} color="#C8102E" />}
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
