import { createFileRoute } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import { LeaderboardCard } from "@/components/leaderboard/leaderboard-card";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/leaderboard")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context.baseUrl);
	},
	component: Leaderboard,
});

function Leaderboard() {
	const inTop10 = true;
	const isLast = true;

	return (
		<div className="w-screen mx-auto">
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
