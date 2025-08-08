import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, ChevronRight, Gift } from "lucide-react";
import StickyNoteTop from "@/assets/sticky-note-top.svg?react";
import { CardFromUser } from "@/components/leaderboard/card-from-user";
import { PageLayout } from "@/components/page-layout";
import CategoryProgressBar from "@/components/profile/category-progress-bar";
import Stamps from "@/components/profile/stamps";
import { requireAuth } from "@/lib/auth";
import { type DormName, dormGroupFromName } from "@/lib/data/dorms";

export const Route = createFileRoute("/profile")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context);
	},
	component: Profile,
});

function Profile() {
	const { user } = Route.useRouteContext();

	const dormGroup = user.dorm
		? dormGroupFromName[user.dorm as DormName]
		: "No housing community";
	const dorm = user.dorm ?? "No dorm"; // consistent with the default in the leaderboard page

	return (
		<PageLayout currentPath="/profile" user={user}>
			<div className="bg-[#F3E9D2] pb-20 p-4 flex flex-col">
				<div className="rounded-4xl shadow-[0_7px_0_#bbb] p-4 mb-6 mt-4 relative overflow-visible">
					<div className="w-full relative z-1 flex justify-center -mt-8 mb-2">
						<StickyNoteTop className="w-3/5" />
					</div>

					<div className="flex flex-row gap-4 items-center">
						<div className="flex flex-col items-center">
							<img
								src={user.dormMascotUrl}
								alt="avatar"
								className={`w-40 h-50 rounded-2xl object-contain shadow-[0_7px_0_#bbb] ${user.house.color}`}
							/>
						</div>

						<div className="flex-1">
							<div className="mb-1">
								<span className="font-bold">Name:</span> {user.name}
							</div>
							<div className="mb-1">
								<span className="font-bold">Andrew ID:</span> {user.user_id}
							</div>
							<div className="mb-1">{dorm}</div>
							<div className="flex items-center gap-2 mb-1">
								<span>{dormGroup}</span>
							</div>
						</div>
					</div>

					{/* Progress Bars */}
					<div className="mb-1">
						<div className="font-semibold text-md">Completed Quests:</div>
						<div className="w-full h-4 bg-gray-700 rounded-full mt-1 mb-4 relative">
							<div
								className="h-4 bg-blue-500 rounded-full absolute top-0 left-0"
								style={{
									width: `${(user.challenges_completed.total / user.total_challenges.total) * 100}%`,
								}}
							/>
							<span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
								{user.challenges_completed.total}/{user.total_challenges.total}
							</span>
						</div>

						{/* Category Progress Bars */}
						<CategoryProgressBar
							categories={Object.entries(
								user.challenges_completed.by_category,
							).map(([name, percentage]) => ({
								name,
								percentage,
							}))}
						/>
					</div>

					{/* Points Information */}
					<div className="space-y-1">
						<div className="flex justify-between items-center">
							<span>Total Scotty Coins:</span>
							<span className="font-bold">{user.scotty_coins.current}</span>
						</div>

						<div className="flex justify-between items-center">
							<span>Carnegie Cup Points:</span>
							<span className="font-bold">
								{user.challenges_completed.total}
							</span>
						</div>
					</div>
				</div>

				<div className="relative mb-2">
					<CardFromUser user={user} to="/leaderboard" />
				</div>

				<Stamps week={user.stamps} />

				{/* Prizes */}
				<div className="mt-2 mb-2 flex items-center gap-2">
					<Gift className="w-6 h-6 text-red-700" />
					<span className="font-semibold text-lg">Prizes</span>
				</div>
				<div className="flex-1 overflow-x-auto mb-4">
					{(!prizeData || prizeData?.rewards.length === 0) &&
					isLoadingPrizes ? (
						<div className="flex items-center justify-center h-64">
							<span className="text-gray-500">Loading prizes...</span>
						</div>
					) : !prizeData || prizeData?.rewards.length === 0 ? (
						<div className="flex-1 overflow-x-auto">
							<div className="flex gap-2 h-64">
								<div className="w-[95vw] h-64 flex items-center justify-center text-center font-bold bg-gray-200 rounded-xl text-3xl border">
									Redeem prizes to see your rewards!
								</div>
							</div>
						</div>
					) : (
						<div className="flex gap-2 h-64">
							{prizeData.rewards.map((reward) => (
								<div
									key={reward.slug}
									className="w-80 h-64 flex-shrink-0 bg-white rounded-xl border p-4 flex flex-col justify-between"
								>
									<div className="flex-1">
										<h3 className="text-lg font-semibold">{reward.name}</h3>
										<p className="text-sm text-gray-600">
											Cost: {reward.cost} Scotty Coins
										</p>
									</div>
									<div className="flex items-center justify-between mt-2">
										<span className="text-sm text-gray-500">
											Stock: {reward.stock}
										</span>
										<Link
											to={`/terrier-trade`}
											className="text-red-700 hover:underline"
										>
											View Details
										</Link>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Gallery */}

				<div className="mb-2 flex items-center gap-2">
					<Camera className="w-6 h-6 text-red-700" />
					<span className="font-semibold text-lg">Gallery</span>
				</div>
				{journalData?.entries?.length ? (
					isLoadingJournal ? (
						<div className="flex-1 flex items-center justify-center h-64">
							<span className="text-gray-500">Loading gallery...</span>
						</div>
					) : (
						<div className="flex-1 overflow-x-auto">
							<div className="flex gap-2 h-64">
								{journalData.entries.map((entry) => (
									<img
										key={entry.challenge_name + entry.note}
										src={entry.image_url || "/images/scotty-coin.svg"}
										alt={entry.challenge_name + " - " + entry.note}
										className="w-80 h-64 object-cover rounded-xl border flex-shrink-0"
									/>
								))}
							</div>
						</div>
					)
				) : (
					<div className="flex-1 overflow-x-auto">
						<div className="flex gap-2 h-64">
							<div className="w-[95vw] h-64 flex items-center justify-center text-center font-bold bg-gray-200 rounded-xl text-3xl border">
								Start completing challenges to see your gallery!
							</div>
						</div>
					</div>
				)}
			</div>
		</PageLayout>
	);
}
