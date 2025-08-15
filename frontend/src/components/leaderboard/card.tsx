import { useNavigate } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import ScottyCoin from "@/components/scotty-coin";
import { type DormName, dormColors, dormGroupFromName } from "@/lib/data/dorms";
import type { ValidPath } from "@/lib/data/page";
import type { components } from "@/lib/schema.gen";

interface LeaderboardCardProps {
	entry: components["schemas"]["LeaderboardEntry"];
	name?: string;
	totalChallenges: number;
	to: ValidPath;
}

export function LeaderboardCard({
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
			className={`bg-white rounded-2xl shadow-[0_3px_0_#bbb] duration-250 transition-all p-4 ${isCurrentUser ? "cursor-pointer hover:translate-y-[3px] hover:shadow-none" : ""}`}
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
					<span className={`font-medium ${textColor}`}>
						{dormGroup ?? "No dorm"}
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
