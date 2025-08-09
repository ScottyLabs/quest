import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
	type DormName,
	dormColors,
	dormGroupFromName,
	dorms,
} from "@/lib/data/dorms";
import { Redeem } from "./redeem";

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

interface TradeMenuCarnegieCupPointsProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	prize: Prize;
}

export function TradeMenuCarnegieCupPoints({
	isOpen,
	onOpenChange,
	prize,
}: TradeMenuCarnegieCupPointsProps) {
	// State for managing the quantity, current level, and dorm selection
	const [quantity, setQuantity] = useState<number>(1);
	const [currentLevel, setCurrentLevel] = useState<number>(1);
	const [isRedeemOpen, setIsRedeemOpen] = useState(false);
	const [selectedDorm, setSelectedDorm] = useState<DormName | null>(null);
	const [showDormSelection, setShowDormSelection] = useState(true);

	// Calculate total cost based on quantity and prize cost
	const totalCost = quantity * prize.cost;

	// Check if user has enough coins (mock value - in real app this would come from user context)
	const userCoins = 14; // Mock user coins
	const hasEnoughCoins = userCoins >= totalCost;

	// Handle quantity changes
	const handleQuantityChange = (newQuantity: number) => {
		if (newQuantity >= 1 && newQuantity <= userCoins) {
			setQuantity(newQuantity);
		}
	};

	// Handle increment and decrement
	const handleIncrement = () => {
		handleQuantityChange(quantity + 1);
	};

	const handleDecrement = () => {
		handleQuantityChange(quantity - 1);
	};

	// Handle claim button click
	const handleClaim = () => {
		if (hasEnoughCoins && selectedDorm) {
			onOpenChange(false);
			setIsRedeemOpen(true);
		}
	};

	// Handle dorm selection
	const handleDormSelect = (dorm: DormName) => {
		setSelectedDorm(dorm);
		setShowDormSelection(false);
	};

	// Handle edit dorm
	const handleEditDorm = () => {
		// Refund the total amount contributed
		setQuantity(1);
		setSelectedDorm(null);
		setShowDormSelection(true);
	};

	// Get dorm color and image
	const getDormColor = (dormName: DormName) => {
		const dormGroup = dormGroupFromName[dormName];
		return dormColors[dormGroup]?.primary || "bg-gray-500";
	};

	const getDormImage = (dormName: DormName) => {
		const dorm = dorms.find((d) => d.name === dormName);
		return dorm?.image_path || "/images/dorm-mascots/default.png";
	};

	// If showing dorm selection or no dorm is selected
	if (showDormSelection || !selectedDorm) {
		return (
			<Dialog open={isOpen} onOpenChange={onOpenChange}>
				<DialogContent
					className="sm:max-w-md bg-white border-none p-0"
					showCloseButton={false}
				>
					<div className="w-96 px-4 pt-4 pb-6 rounded-[20px] inline-flex flex-col justify-start items-start gap-5">
						{/* Header */}
						<div className="self-stretch flex flex-col justify-start items-start gap-3.5">
							<div className="self-stretch h-24 px-4 py-3 bg-white rounded-[10px] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] inline-flex justify-start items-center gap-4">
								<div className="w-52 inline-flex flex-col justify-start items-start gap-1">
									<div className="self-stretch justify-start">
										<span className="text-Secondary text-xl font-extrabold font-['Open_Sans'] tracking-tight">
											Carnegie Cup Points
										</span>
									</div>
									<div className="w-64 justify-start text-Tertiary text-xs font-normal font-['Open_Sans'] tracking-tight">
										Choose Dorm
									</div>
								</div>
								<div className="w-12 h-9 bg-red-800"></div>
								<div className="w-1 h-[3.15px] bg-rose-400"></div>
								<div className="w-0.5 h-[3.43px] bg-zinc-600"></div>
							</div>
						</div>

						{/* Dorm Selection */}
						<div className="self-stretch flex flex-col justify-start items-start gap-3">
							<div className="self-stretch inline-flex justify-center items-center gap-2.5">
								<div className="flex-1 justify-start text-Tertiary text-base font-semibold font-['Open_Sans'] tracking-tight">
									Select Your Dorm:
								</div>
							</div>
							<div className="self-stretch grid grid-cols-2 gap-3">
								{dorms.map((dorm) => (
									<button
										key={dorm.name}
										type="button"
										onClick={() => handleDormSelect(dorm.name)}
										className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg shadow-[0px_2px_4px_0px_rgba(0,0,0,0.1)] hover:shadow-[0px_4px_8px_0px_rgba(0,0,0,0.15)] transition-shadow"
									>
										<div
											className={`w-12 h-12 rounded-full ${getDormColor(dorm.name)} flex items-center justify-center`}
										>
											<img
												src={dorm.image_path}
												alt={dorm.name}
												className="w-8 h-8 object-contain"
											/>
										</div>
										<div className="text-center text-xs font-semibold text-gray-700">
											{dorm.name}
										</div>
									</button>
								))}
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	// Main component with dorm selected
	return (
		<>
			<Dialog open={isOpen} onOpenChange={onOpenChange}>
				<DialogContent
					className="sm:max-w-md bg-white border-none p-0"
					showCloseButton={false}
				>
					<div className="w-96 px-2.5 py-4 bg-white rounded-[20px] inline-flex justify-start items-center gap-2.5">
						<div className="w-96 inline-flex flex-col justify-start items-center">
							<div className="w-80 flex flex-col justify-start items-start gap-3.5">
								{/* Prize card with selected dorm */}
								<div className="self-stretch h-24 px-4 py-3 bg-white rounded-[10px] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] inline-flex justify-start items-center gap-4">
									<div className="w-52 inline-flex flex-col justify-start items-start gap-1">
										<div className="self-stretch justify-start">
											<span className="text-Secondary text-xl font-extrabold font-['Open_Sans'] tracking-tight">
												Carnegie Cup Points
											</span>
										</div>
										<div className="w-64 justify-start text-Tertiary text-xs font-normal font-['Open_Sans'] tracking-tight">
											Dorm: {selectedDorm}
										</div>
									</div>
									{selectedDorm && (
										<div
											className={`w-20 h-20 px-6 rounded-3xl shadow-[0px_4px_0px_0px_rgba(6,121,74,1.00)] outline outline-4 outline-offset-[-4px] outline-emerald-700 flex justify-center items-center gap-2.5 overflow-hidden`}
										>
											<div
												className={`w-36 h-36 ${getDormColor(selectedDorm)} rounded-3xl`}
											></div>
											<div className="w-11 h-14 relative shadow-[0px_4px_0px_0px_rgba(0,0,0,0.25)] overflow-hidden">
												<img
													src={getDormImage(selectedDorm)}
													alt={selectedDorm}
													className="w-16 h-14 object-contain"
												/>
											</div>
										</div>
									)}
								</div>

								{/* Content section */}
								<div className="self-stretch flex flex-col justify-start items-start gap-6">
									{/* Current Level section */}
									<div className="self-stretch flex flex-col justify-start items-start gap-[5px]">
										<div className="self-stretch inline-flex justify-center items-center gap-2.5">
											<div className="flex-1 justify-start text-Tertiary text-base font-semibold font-['Open_Sans'] tracking-tight">
												Current Level: +100 CC
											</div>
											{selectedDorm && (
												<div className="flex justify-start items-center gap-[5px]">
													<div className="w-5 h-5 relative overflow-hidden">
														<div className="w-5 h-5 left-[0.83px] top-[0.73px] absolute bg-rose-700"></div>
													</div>
													<button
														type="button"
														onClick={handleEditDorm}
														className="justify-start text-rose-700 text-base font-semibold font-['Open_Sans'] underline tracking-tight"
													>
														Edit
													</button>
												</div>
											)}
										</div>

										{/* Level progress bar and display */}
										<div className="self-stretch flex flex-col justify-start items-start gap-6">
											{/* Progress bar */}
											<div className="w-80 inline-flex justify-start items-center">
												<div className="w-4 h-4 origin-top-left rotate-180 bg-neutral-700 rounded-full"></div>
												<div className="p-2.5 inline-flex flex-col justify-start items-start gap-2.5">
													<div className="w-72 h-4 bg-neutral-700"></div>
												</div>
												<div className="w-4 h-4 bg-neutral-700 rounded-full"></div>
											</div>
											{/* Level progress bar */}
											<div className="w-44 inline-flex justify-start items-center">
												<div className="w-4 h-4 origin-top-left rotate-180 bg-green-500 rounded-full"></div>
												<div className="p-2.5 inline-flex flex-col justify-start items-start gap-2.5">
													<div className="w-40 h-4 bg-green-500"></div>
												</div>
												<div className="w-4 h-4 bg-green-500 rounded-full"></div>
											</div>
											<div className="justify-start text-white text-sm font-semibold font-['Open_Sans'] tracking-tight">
												500/4000
											</div>
											<div className="justify-start text-white text-2xl font-semibold font-['Open_Sans'] tracking-wide">
												{currentLevel}
											</div>
										</div>
									</div>

									{/* Description section */}
									<div className="self-stretch flex flex-col justify-start items-start gap-[3px]">
										<div className="self-stretch inline-flex justify-center items-center gap-2.5">
											<div className="flex-1 justify-start text-Tertiary text-base font-semibold font-['Open_Sans'] tracking-tight">
												Description:
											</div>
										</div>
										<div className="self-stretch inline-flex justify-center items-center gap-2.5">
											<div className="flex-1 justify-start">
												<span className="text-Steel-Grey text-xs font-semibold font-['Open_Sans'] tracking-tight">
													Add Points to fill your Collective dorm points with
													other people in your dorm with each level you unlock
													Carnegie cup points for the entire dorm.
													<br />
												</span>
												<span className="text-Steel-Grey text-xs font-semibold font-['Open_Sans'] tracking-tight">
													Level 1 - 100 Coins = +10 CC <br />
													Level 2 - 400 Coins = +40 CC
													<br />
													Level 3 - 100 Coins = +100CC <br />
													Level 4 - 1500 Coins = +200CC
													<br />
													Level 5 - 2500 Coins = +500CC
												</span>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Quantity and cost section */}
							<div className="self-stretch p-2.5 flex flex-col justify-center items-center gap-2.5">
								<div className="self-stretch p-2.5 flex flex-col justify-start items-start gap-2.5">
									<div className="self-stretch flex flex-col justify-start items-start gap-4">
										{/* Slider section - replaces "Not Enough Scotty Coins" text */}
										<div className="self-stretch flex flex-col justify-start items-start gap-2">
											<div className="self-stretch inline-flex justify-center items-center gap-2.5">
												<div className="flex-1 justify-start text-Steel-Grey text-base font-semibold font-['Open_Sans'] tracking-tight">
													Adjust Amount:
												</div>
											</div>
											<div className="w-full">
												<Slider
													value={quantity}
													onValueChange={handleQuantityChange}
													min={1}
													max={userCoins}
													step={1}
													className="w-full"
													showValue={false}
													disabled={!selectedDorm}
												/>
											</div>
										</div>
									</div>
								</div>

								{/* Contribute button */}
								<div className="w-80 h-12 shadow-[0px_4px_0px_0px_rgba(54,1,1,1.00)] inline-flex justify-end items-center">
									<button
										type="button"
										onClick={handleClaim}
										disabled={!selectedDorm || !hasEnoughCoins}
										className="flex-1 h-12 px-8 py-3 bg-Primary rounded-3xl flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-Primary/90 transition-colors"
									>
										<div className="text-center justify-start text-Highlight text-base font-bold font-['Open_Sans'] leading-normal">
											Contribute
										</div>
									</button>
								</div>
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<Redeem
				isOpen={isRedeemOpen}
				onOpenChange={setIsRedeemOpen}
				prize={{
					name: prize.name,
					amount: quantity,
					date: new Date().toLocaleDateString(),
				}}
			/>
		</>
	);
}
