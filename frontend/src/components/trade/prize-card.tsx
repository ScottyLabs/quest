import { useState } from "react";
import RedeemedCheck from "@/assets/redeemed-check.svg?react";
import ScottyCoin from "@/components/scotty-coin";
import { TradeMenu } from "@/components/trade/menu";
import { useApi, useAppContext } from "@/lib/app-context";
import {
	type DormGroup,
	type DormName,
	dormColors,
	dormGroups,
} from "@/lib/data/dorms";
import { rewardImagePaths } from "@/lib/data/rewards";
import type { components } from "@/lib/schema.gen";

interface PrizeCardProps {
	prize: components["schemas"]["RewardResponse"];
}

export function PrizeCard({ prize }: PrizeCardProps) {
	const { $api } = useApi();
	const { data: userProfile } = $api.useQuery("get", "/api/profile");

	const { adminMode } = useAppContext();
	const isVerify = adminMode === "verify";

	const userDorm = (userProfile?.dorm as DormName) || "";
	const userDormGroup =
		(Object.entries(dormGroups).find(([, dorms]) =>
			dorms.find((d) => d.name === userDorm),
		)?.[0] as DormGroup) || "";

	const houseColorLightBg = dormColors[userDormGroup]?.light || "bg-white"; // for background
	const houseColorPrimaryBg = dormColors[userDormGroup]?.primary || "bg-white"; // for progress bar

	const isCarnegieCup = prize.name === "Carnegie Cup Contribution";
	const stock = prize.stock ?? 0; // Default to 0 if stock is not provided
	const claimed = prize.transaction_info?.total_purchased ?? 0; // Default to 0 if not provided
	const [isTradeMenuOpen, setIsTradeMenuOpen] = useState(false);

	return (
		<>
			<div className="w-full max-w-2xl mx-auto relative rounded-[20px] min-h-24">
				<div
					className={
						"w-full pl-6 pr-6 py-6 left-0 top-0 absolute rounded-[20px] inline-flex justify-between items-center shadow-[0_3px_0_#bbb] h-full " +
						(isCarnegieCup ? houseColorLightBg : "bg-white")
					}
				>
					<div className="inline-flex items-center justify-center gap-6 flex-1">
						<div className="flex-shrink-0 flex flex-col items-center justify-center h-full">
							<div className="size-14 flex items-center justify-center">
								<img
									src={rewardImagePaths[prize.name]}
									alt={prize.name}
									className="w-full h-full rounded-lg object-contain"
								/>
							</div>
						</div>
						<div className="flex-1 inline-flex flex-col justify-start items-start gap-2">
							<div className="self-stretch inline-flex justify-between items-start">
								<div className="flex-1 flex justify-center items-center gap-2.5 flex-wrap content-center">
									<div className={`flex-1 text-black font-bold font-['Open_Sans'] tracking-tight leading-tight ${isCarnegieCup ? 'text-center text-lg' : 'justify-start text-base'}`}>
										{prize.name}
									</div>
								</div>
								<div className="flex justify-center items-center gap-2.5">
									{!isCarnegieCup && (
										<div className="justify-start">
											<span className="text-gray-500 text-xs font-bold font-['Open_Sans'] leading-none tracking-tight">
												Stock: {stock}
											</span>
										</div>
									)}
								</div>
							</div>

							{/* Progress bar for claimed vs allowed to claim */}
							<div className="w-full h-4 bg-gray-300 rounded-full relative">
								<div
									className={
										"h-4 rounded-full absolute top-0 left-0 transition-all duration-300 " +
										(isCarnegieCup ? houseColorPrimaryBg : "bg-amber-700")
									}
									style={{
										width: `${isCarnegieCup ? 1 : Math.min((claimed / prize.trade_limit) * 100, 100)}%`,
									}}
								/>
								<span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
									{claimed}/{stock >= 0 ? prize.trade_limit : "∞"}
								</span>
							</div>
						</div>
					</div>

					<div className="flex-shrink-0 ml-6">
						<button
							type="button"
							onClick={() => setIsTradeMenuOpen(true)}
							className="w-16 h-12 bg-zinc-100 rounded-xl shadow-[0px_6px_0px_0px_rgba(215,215,215,1.00)] flex items-center justify-center p-3 hover:bg-zinc-200 transition-colors disabled:opacity-50"
						>
							<div className="flex items-center justify-center gap-1">
								<div className="text-black text-base font-semibold font-['Open_Sans'] tracking-tight">
									{isVerify ? "Verify" : prize.cost}
								</div>
								{isVerify ? (
									<RedeemedCheck className="w-4 h-4" />
								) : (
									<ScottyCoin className="w-4 h-4" />
								)}
							</div>
						</button>
					</div>
				</div>
			</div>

			{isTradeMenuOpen && ( // prevents slow load due to forced reflow
				<TradeMenu
					isOpen={isTradeMenuOpen}
					onOpenChange={setIsTradeMenuOpen}
					prize={prize}
					adminMode={isVerify}
				/>
			)}
		</>
	);
}
