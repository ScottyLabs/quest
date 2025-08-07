import { ChevronRight } from "lucide-react";

interface LeaderboardCardProps {
	rank: number;
	name: string;
	userId: string;
	coinsEarned: number;
	highlight?: boolean;
}

export function LeaderboardCard({
	rank: place,
	name,
	userId,
	coinsEarned: points,
	highlight = false,
}: LeaderboardCardProps) {
	return (
		<div
			className={`flex flex-row items-center px-3 py-2.5 border-b last:border-b-0 transition-colors rounded-none ${highlight ? "bg-red-600 text-white" : "bg-white text-black"}`}
		>
			<div className="w-7 text-center font-medium text-base shrink-0 mr-1.5">
				{place}
			</div>

			{/* User Info */}
			<div className="flex-1 min-w-0">
				<span className="font-semibold text-base leading-tight truncate block">
					{name}
				</span>
				<span
					className={`text-xs leading-tight text-muted-foreground w-[100px] overflow-hidden overflow-ellipsis whitespace-nowrap inline-block ${highlight && "text-white/80"}`}
				>
					#{userId}
				</span>
			</div>

			{/* Points & Right Arrow */}
			<div className="flex items-center gap-1.5 ml-1.5">
				<span className="font-semibold text-base flex items-center gap-1">
					{points}
					<img
						src="/images/scotty-coin.svg"
						alt="ScottyCoin"
						className="w-7 h-7 relative top-1"
					/>
				</span>

				<ChevronRight className="w-5 h-5 opacity-60" />
			</div>
		</div>
	);
}
