import { BadgeCheck } from "lucide-react";
import { useState } from "react";
import ScottyCoin from "@/assets/scotty-coin.svg?react";
import { TradeMenu } from "./trade-menu";
import { TradeMenuCarnegieCupPoints } from "./trade-menu-carnegie-cup-points";

interface Prize {
	name: string;
	cost: number;
	claimed: number;
	allowedToClaim: number;
	remaining: number;
	total: number;
	imageUrl: string;
	stock?: number;
	transaction_info?: {
		total_purchased: number;
		complete_count: number;
		incomplete_count: number;
	};
}

export function PrizeCard({ prize }: { prize: Prize }) {
	const isMaxClaimed = prize.claimed === prize.allowedToClaim;
	const stock = prize.stock ?? prize.remaining;
	const claimed = prize.transaction_info?.complete_count ?? prize.claimed;
	const total = prize.total || 35; // Default to 35 if not provided
	const [isTradeMenuOpen, setIsTradeMenuOpen] = useState(false);

	// Check if this is a Carnegie Cup Points prize
	const isCarnegieCupPoints = prize.name === "Carnegie Cup Points";

	return (
		<>
			<div className="w-full max-w-2xl mx-auto relative rounded-[20px] h-24">
				<div className="w-full pl-6 pr-6 py-6 left-0 top-0 absolute bg-white rounded-[20px] inline-flex justify-between items-center shadow-[0_3px_0_#bbb] h-full">
					<div className="flex justify-start items-start gap-6 flex-1">
						<div className="flex-shrink-0 flex items-center justify-center">
							<div className="relative -m-1 size-12">
								<div
									className={`absolute size-7/8 left-1/8 top-1/2 -translate-y-1/2 -rotate-20 rounded-lg bg-amber-700`}
								/>
							</div>
						</div>
						<div className="flex-1 inline-flex flex-col justify-start items-start gap-2">
							<div className="self-stretch inline-flex justify-between items-start">
								<div className="flex-1 flex justify-center items-center gap-2.5 flex-wrap content-center">
									<div className="flex-1 justify-start text-black text-base font-bold font-['Open_Sans'] tracking-tight">
										{prize.name}
									</div>
								</div>
								<div className="flex justify-center items-center gap-2.5">
									<div className="justify-start">
										<span className="text-gray-500 text-xs font-bold font-['Open_Sans'] leading-none tracking-tight">
											Stock: {stock}
										</span>
									</div>
								</div>
							</div>

							{/* Progress bar for claimed vs allowed to claim */}
							<div className="w-full h-4 bg-gray-300 rounded-full relative">
								<div
									className="h-4 bg-amber-400 rounded-full absolute top-0 left-0 transition-all duration-300"
									style={{
										width: `${Math.min((claimed / prize.allowedToClaim) * 100, 100)}%`,
									}}
								/>
								<span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
									{claimed}/{prize.allowedToClaim}
								</span>
							</div>
						</div>
					</div>
					<div className="flex-shrink-0 ml-6">
						<button
							type="button"
							onClick={() => setIsTradeMenuOpen(true)}
							className="w-16 h-12 bg-zinc-100 rounded-xl shadow-[0px_6px_0px_0px_rgba(215,215,215,1.00)] flex items-center justify-center p-3 hover:bg-zinc-200 transition-colors"
						>
							<div className="flex items-center justify-center gap-1">
								<div className="text-black text-base font-semibold font-['Open_Sans'] tracking-tight">
									{prize.cost}
								</div>
								<ScottyCoin className="w-4 h-4" />
							</div>
						</button>
					</div>
				</div>
			</div>

			{isCarnegieCupPoints ? (
				<TradeMenuCarnegieCupPoints
					isOpen={isTradeMenuOpen}
					onOpenChange={setIsTradeMenuOpen}
					prize={prize}
				/>
			) : (
				<TradeMenu
					isOpen={isTradeMenuOpen}
					onOpenChange={setIsTradeMenuOpen}
					prize={prize}
				/>
			)}
		</>
	);
}
