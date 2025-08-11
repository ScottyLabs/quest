import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, ChevronRight, Gift } from "lucide-react";
import ScottyCoin from "@/assets/scotty-coin.svg?react";
import StickyNoteTop from "@/assets/sticky-note-top.svg?react";
import { PageLayout } from "@/components/page-layout";
import CategoryProgressBar from "@/components/profile/category-progress-bar";
import Stamps from "@/components/profile/stamps";
import { Card } from "@/components/ui/card";
import { useApi } from "@/lib/api-context";
import { requireAuth } from "@/lib/auth";
import {
	type DormName,
	dormColors,
	dormGroupFromName,
	dormImagePaths,
} from "@/lib/data/dorms";

export const Route = createFileRoute("/profile")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context);
	},
	component: Profile,
});

// Utility function to calculate stamps from recent activity days
function calculateStampsFromActivity(recentActivityDays: string[]): boolean[] {
	const today = new Date();
	const week = new Array(7).fill(false);

	// Convert activity days to Date objects and check if they're in the current week
	recentActivityDays.forEach((activityDay) => {
		const activityDate = new Date(activityDay);
		const dayOfWeek = activityDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

		// Check if the activity date is within the last 7 days
		const daysDiff = Math.floor(
			(today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24),
		);
		if (daysDiff < 7) {
			week[dayOfWeek] = true;
		}
	});

	return week;
}

// Utility function to get dorm mascot image
function getDormMascotImage(dormName: string | null | undefined): string {
	if (!dormName) {
		return "/images/sample-profile-pic.svg";
	}

	return dormImagePaths[dormName] || "/images/sample-profile-pic.svg";
}

// Utility function to get dorm color (now using primary)
function getDormColor(dormName: string | null | undefined): string {
	if (!dormName) {
		return "bg-white";
	}

	const dormGroup = dormGroupFromName[dormName as DormName];
	if (!dormGroup || !dormColors[dormGroup]) {
		return "bg-white";
	}

	return dormColors[dormGroup].primary || "bg-white";
}

// Utility function to get dorm shadow color (using selected if darker)
function getDormShadowColor(dormName: string | null | undefined): string {
	if (!dormName) {
		return "shadow-[0_7px_0_#bbb]";
	}

	const dormGroup = dormGroupFromName[dormName as DormName];
	if (!dormGroup || !dormColors[dormGroup]) {
		return "shadow-[0_7px_0_#bbb]";
	}

	// Color mapping for primary and selected colors
	const colorMap: Record<string, { primary: string; selected: string }> = {
		"bg-housing-1": { primary: "#ffb22f", selected: "#9e7105" }, // Morewood E-Tower
		"bg-housing-2": { primary: "#d5242c", selected: "#691418" }, // Hill
		"bg-housing-3": { primary: "#083372", selected: "#022557" }, // Donner + West Wing
		"bg-housing-4": { primary: "#189846", selected: "#06794a" }, // Stever
		"bg-housing-5": { primary: "#caa3e8", selected: "#4d2e65" }, // Mudge
		"bg-housing-6": { primary: "#e71763", selected: "#81133b" }, // Fifth Avenue/RANCH
		"bg-housing-7": { primary: "#f3ba4f", selected: "#8a5a03" }, // Morewood Gardens
		"bg-housing-8": { primary: "#742c2a", selected: "#5c1f1f" }, // WhescoMM
	};

	const primaryColor = dormColors[dormGroup].primary;
	const selectedColor = dormColors[dormGroup].selected;

	if (primaryColor && colorMap[primaryColor]) {
		const colors = colorMap[primaryColor];

		// Convert hex colors to RGB for brightness comparison
		const getBrightness = (hex: string) => {
			const r = parseInt(hex.slice(1, 3), 16);
			const g = parseInt(hex.slice(3, 5), 16);
			const b = parseInt(hex.slice(5, 7), 16);
			return (r * 299 + g * 587 + b * 114) / 1000;
		};

		const primaryBrightness = getBrightness(colors.primary);
		const selectedBrightness = getBrightness(colors.selected);

		// Use selected color if it's darker, otherwise use primary
		const shadowColor =
			selectedBrightness < primaryBrightness ? colors.selected : colors.primary;

		return `shadow-[0_7px_0_${shadowColor}]`;
	}

	return "shadow-[0_7px_0_#bbb]";
}

export const useJournalData = () => {
	const { $api } = useApi();
	const query = $api.useQuery("get", "/api/journal", {});

	if (query.isError) {
		console.error("Error fetching journal data:", query.error);
	}

	return query;
};

export const usePrizeData = () => {
	const { $api } = useApi();
	const query = $api.useQuery("get", "/api/rewards", {});

	if (query.isError) {
		console.error("Error fetching prize data:", query.error);
	}

	return query;
};

function Profile() {
	const { user } = Route.useRouteContext();

	const { data: journalData, isLoading: isLoadingJournal } = useJournalData();
	const { data: prizeData, isLoading: isLoadingPrizes } = usePrizeData();

	const dormGroup = user.dorm
		? dormGroupFromName[user.dorm as DormName]
		: "No housing community";
	const dorm = user.dorm ?? "No dorm";

	// Calculate stamps from recent activity days
	const stamps = calculateStampsFromActivity(user.recent_activity_days || []);

	// Get dorm mascot image and color
	const dormMascotImage = getDormMascotImage(user.dorm);
	const dormColor = getDormColor(user.dorm);

	return (
		<PageLayout currentPath="/profile" user={user} showPageHeader={false}>
			<div className="p-4 flex flex-col">
				{/* Profile Card */}
				<Card className="rounded-4xl shadow-[0_7px_0_#bbb] p-4 mb-6 mt-4 relative overflow-visible">
					{/* Decorative SVG at the top */}
					<div className="relative z-1 w-full flex justify-center -mt-8 mb-2">
						<StickyNoteTop className=" h-auto max-w-md" />
					</div>

					<div className="flex flex-row gap-4 items-center">
						<div className="flex flex-col items-center">
							<div
								className={`p-3 rounded-2xl ${dormColor} ${getDormShadowColor(user.dorm)}`}
							>
								<img
									src={dormMascotImage}
									alt={`${dorm} mascot`}
									className="w-40 h-50 rounded-xl object-contain"
								/>
							</div>
						</div>
						<div className="flex-1 min-w-0">
							<div className="mb-1">
								<span className="font-bold">Name:</span> {user.name}
							</div>
							<div className="mb-1">
								<span className="font-bold">Andrew ID:</span> {user.user_id}
							</div>
							<div className="mb-1 flex flex-wrap">
								<span className="font-bold flex-shrink-0">Dorm:</span>{" "}
								<span className="ml-1 break-words">{dorm}</span>
							</div>
							<div className="mb-1 flex flex-wrap">
								<span className="font-bold flex-shrink-0">
									Housing Community:
								</span>{" "}
								<span className="ml-1 break-words">{dormGroup}</span>
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
							<span>Total ScottyCoins:</span>
							<span className="font-bold">{user.scotty_coins.current}</span>
						</div>
						<div className="flex justify-between items-center">
							<span>Carnegie Cup Points:</span>
							{/* TODO: replace this with the current value */}
							<span className="font-bold">
								{user.challenges_completed.total}
							</span>
						</div>
					</div>
				</Card>

				{/* Leaderboard Card */}
				<Link to="/leaderboard" className="relative mb-2">
					<div className="bg-red-700 rounded-2xl shadow-[0_7px_0_#bbb] flex items-center px-4 py-4 mb-4 text-white z-10 relative">
						<div className="font-bold mr-8">{user.leaderboard_position}</div>
						<div className="flex-1">
							<div className="font-semibold">{user.name}</div>
							<div className="text-md">{user.user_id}</div>
						</div>

						<div className="text-lg font-bold flex items-center gap-2">
							<ScottyCoin className="size-5 my-auto relative top-1" />
							<p>{user.scotty_coins.current}</p>
						</div>

						<ChevronRight />
					</div>
				</Link>

				<Stamps week={stamps} />

				{/* Prizes */}
				<div className="mt-2 mb-2 flex items-center gap-2">
					<Gift className="w-6 h-6 text-default" />
					<span className="font-semibold text-lg">Prizes</span>
				</div>
				<div className="flex-1 overflow-x-auto mb-4">
					{isLoadingPrizes ? (
						<div className="flex items-center justify-center h-64">
							<span className="text-gray-500">Loading prizes...</span>
						</div>
					) : !prizeData || prizeData?.rewards?.length === 0 ? (
						<div className="flex-1 overflow-x-auto">
							<div className="flex gap-2 h-64">
								<div className="w-[95vw] h-64 flex items-center justify-center text-center font-bold bg-gray-200 rounded-xl text-3xl border">
									Redeem prizes to see your rewards!
								</div>
							</div>
						</div>
					) : (
						<div className="flex gap-2 h-64">
							{/* {prizeData.rewards.map((reward) => (
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
											className="text-default hover:underline"
										>
											View Details
										</Link>
									</div>
								</div>
							))} */}
						</div>
					)}
				</div>

				{/* Gallery */}
				<div className="mb-2 flex items-center gap-2">
					<Camera className="w-6 h-6 text-default" />
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
										alt={`${entry.challenge_name} - ${entry.note}`}
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
