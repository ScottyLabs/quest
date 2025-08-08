import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EllipsisVertical, Trophy } from "lucide-react";
import ScottyCoin from "@/assets/scotty-coin.svg?react";
import { useApi } from "@/lib/api-context";
import { requireAuth } from "@/lib/auth";
import { type DormName, dormColors, dormGroupFromName } from "@/lib/data/dorms";
import type { ValidPath } from "@/lib/data/page";
import type { components } from "@/lib/schema.gen";

export const Route = createFileRoute("/leaderboard")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context);
	},
	component: Leaderboard,
});

interface LeaderboardCardProps {
	entry: components["schemas"]["LeaderboardEntry"];
	name?: string;
	totalChallenges: number;
	to: ValidPath;
}

function LeaderboardCard({
	entry,
	name,
	totalChallenges,
	to,
}: LeaderboardCardProps) {
	const trophyColors = [
		"fill-yellow-500 text-yellow-500",
		"fill-gray-400 text-gray-400",
		"fill-yellow-600 text-yellow-600",
	];

	const dormGroup = entry.dorm && dormGroupFromName[entry.dorm as DormName];
	const dormColor = dormGroup ? dormColors[dormGroup].selected : "bg-gray-100";
	const textColor = dormGroup ? dormColors[dormGroup].text : "text-gray-500";

	const isCurrentUser = name === entry.name;

	const navigate = useNavigate();
	const toPath = () => {
		if (isCurrentUser) navigate({ to });
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: button component breaks styling
		// biome-ignore lint/a11y/useKeyWithClickEvents: TODO
		<div
			onClick={toPath}
			className={`bg-white rounded-2xl shadow-[0_3px_0_#bbb] duration-250 transition-all p-4 ${isCurrentUser ? "cursor-pointer hover:shadow-none" : ""}`}
		>
			<div className="flex items-center justify-between gap-1">
				<div className="flex items-center space-x-3">
					<div
						title={entry.dorm ?? undefined}
						className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold text-white ${dormColor}`}
					>
						#{entry.rank}
					</div>

					<div className="flex gap-2">
						<h3 className="font-bold text-gray-900">
							{entry.name}
							<span className="italic font-normal text-gray-500">
								{isCurrentUser && " (you)"}
							</span>
						</h3>

						{entry.rank <= 3 && (
							<Trophy
								className={`size-5 my-auto ${trophyColors[entry.rank - 1]}`}
							/>
						)}
					</div>
				</div>

				<div className="text-right flex gap-2 text-gray-900">
					<ScottyCoin className="size-5 my-auto" />
					<span className="font-bold">{entry.coins_earned}</span>
				</div>
			</div>

			<div className="flex items-center justify-between text-sm mt-1">
				<div>
					<span className="text-gray-600">Dorm: </span>
					<span className={`font-medium ${textColor}`}>
						{entry.dorm ?? "No dorm"}
					</span>
				</div>

				<div className="flex gap-2">
					<span className="text-gray-600">Completed</span>
					<span className="font-medium text-gray-900">
						{entry.challenges_completed} / {totalChallenges}
					</span>
				</div>
			</div>
		</div>
	);
}

interface LeaderboardFromProfileProps {
	profile?: components["schemas"]["UserProfileResponse"];
	to: ValidPath;
}

export function LeaderboardFromProfile({
	profile,
	to,
}: LeaderboardFromProfileProps) {
	return (
		<LeaderboardCard
			// The entry is not loaded, so construct it manually from profile
			entry={{
				challenges_completed: profile?.challenges_completed.total ?? 0,
				coins_earned: profile?.scotty_coins.total_earned ?? 0,
				coins_spent: profile?.scotty_coins.total_spent ?? 0,
				dorm: profile?.dorm,
				// If there is no name for some reason, defaulting to "You"
				// will also ensure that the italic "(You)" is not added too
				name: profile?.name ?? "You",
				rank: profile?.leaderboard_position ?? Infinity,
				user_id: profile?.user_id ?? "No user ID",
			}}
			name={profile?.name}
			totalChallenges={profile?.total_challenges.total ?? 0}
			to={to}
		/>
	);
}

type LeaderboardResponse = components["schemas"]["LeaderboardResponse"];

function Leaderboard() {
	const { $api } = useApi();
	const { data: profile } = $api.useQuery("get", "/api/profile");

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
		$api.useInfiniteQuery(
			"get",
			"/api/leaderboard",
			{
				params: {
					query: {
						limit: 20,
					},
				},
			},
			{
				getNextPageParam: (lastPage: LeaderboardResponse) =>
					lastPage.has_next ? lastPage.next_cursor : undefined,
				initialPageParam: undefined,
				pageParamName: "after_rank", // which query param to use for pagination
			},
		);

	const allEntries = data?.pages.flatMap((page) => page.entries) ?? [];
	const position = profile?.leaderboard_position ?? Infinity;

	return (
		<div className="px-4 pt-6 max-w-xl mx-auto [view-transition-name:main-content]">
			<div className="space-y-3">
				{allEntries.map((entry) => (
					<LeaderboardCard
						key={entry.rank}
						entry={entry}
						name={profile?.name}
						totalChallenges={profile?.total_challenges.total ?? 0}
						to="/profile"
					/>
				))}
			</div>

			{hasNextPage && (
				<div className="my-6 text-center">
					<button
						type="button"
						onClick={() => fetchNextPage()}
						disabled={isFetchingNextPage}
						className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
					>
						{isFetchingNextPage ? "Loading..." : "Load More"}
					</button>
				</div>
			)}

			{position > allEntries.length && (
				<div className="flex flex-col gap-6 mt-6">
					<EllipsisVertical className="mx-auto text-white" />
					<LeaderboardFromProfile profile={profile} to="/profile" />
				</div>
			)}
		</div>
	);
}
