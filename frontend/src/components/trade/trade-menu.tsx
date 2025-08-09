import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import {
	ButtonSwitch,
	type ButtonSwitchOption,
} from "@/components/ui/button-switch";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

interface TradeMenuProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	prize: Prize;
}

export function TradeMenu({ isOpen, onOpenChange, prize }: TradeMenuProps) {
	// State for managing the selected size and quantity
	const [selectedSize, setSelectedSize] = useState<string>("L");
	const [quantity, setQuantity] = useState<number>(1);
	const [isRedeemOpen, setIsRedeemOpen] = useState(false);

	// Define size options for the ButtonSwitch component
	const sizeOptions: ButtonSwitchOption[] = [
		{ value: "S", label: "S" },
		{ value: "M", label: "M" },
		{ value: "L", label: "L" },
	];

	// Calculate total cost based on quantity and prize cost
	const totalCost = quantity * prize.cost;

	// Check if user has enough coins (mock value - in real app this would come from user context)
	const userCoins = 14; // Mock user coins
	const hasEnoughCoins = userCoins >= totalCost;

	// Handle quantity changes
	const handleQuantityChange = (newQuantity: number) => {
		if (newQuantity >= 1 && newQuantity <= (prize.stock || 1)) {
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
		if (hasEnoughCoins) {
			onOpenChange(false);
			setIsRedeemOpen(true);
		}
	};

	return (
		<>
			<Dialog open={isOpen} onOpenChange={onOpenChange}>
				<DialogContent
					className="sm:max-w-md bg-white border-none p-0"
					showCloseButton={false}
				>
					{/* Main container with padding and rounded corners - extended to fill space */}
					<div className="w-full h-full px-4 pt-4 pb-9 bg-white rounded-[20px] flex flex-col justify-start items-center gap-12">
						{/* Top section with prize card and description */}
						<div className="self-stretch flex flex-col justify-start items-end gap-5">
							{/* Prize card with header information integrated */}
							<div className="self-stretch h-24 px-4 py-3 bg-white rounded-[10px] inline-flex justify-start items-center gap-4 w-full">
								{/* Prize information container - extended to fill space */}
								<div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
									{/* Prize name */}
									<div className="self-stretch justify-start text-Secondary text-2xl font-extrabold font-['Open_Sans'] tracking-wide">
										{prize.name}
									</div>
									{/* Prize details (cost, claimed, stock) - integrated into the card */}
									<div className="w-full justify-start">
										<span className="text-Tertiary text-xs font-normal font-['Open_Sans'] tracking-tight">
											Cost:{" "}
										</span>
										<span className="text-Tertiary text-xs font-bold font-['Open_Sans'] tracking-tight">
											{prize.cost} ScottyCoins
										</span>
										<br />
										<span className="text-Tertiary text-xs font-normal font-['Open_Sans'] tracking-tight">
											Claimed:{" "}
										</span>
										<span className="text-Tertiary text-xs font-bold font-['Open_Sans'] tracking-tight">
											{prize.claimed}/{prize.allowedToClaim}
										</span>
										<br />
										<span className="text-Tertiary text-xs font-normal font-['Open_Sans'] tracking-tight">
											Stock:{" "}
										</span>
										<span className="text-Tertiary text-xs font-bold font-['Open_Sans'] tracking-tight">
											{prize.stock}
										</span>
									</div>
								</div>
								{/* Prize image placeholder */}
								<img
									className="w-16 h-16 rounded-[5px] flex-shrink-0"
									src={prize.imageUrl || "https://placehold.co/71x65"}
									alt={prize.name}
								/>
							</div>

							{/* Description section */}
							<div className="self-stretch flex flex-col justify-start items-start gap-[3px]">
								{/* Description label */}
								<div className="self-stretch inline-flex justify-center items-center gap-2.5">
									<div className="flex-1 justify-start text-Tertiary text-base font-semibold font-['Open_Sans'] tracking-tight">
										Description:
									</div>
								</div>
								{/* Description text */}
								<div className="self-stretch inline-flex justify-center items-center gap-2.5">
									<div className="flex-1 justify-start text-Steel-Grey text-xs font-normal font-['Open_Sans'] tracking-tight">
										Sed ut orci vitae eros egestas euismod. Praesent ut orci
										sagittis justo convallis egestas. Praesent porttitor velit
										in mauris rutrum, in porta tellus tempus. In hac habitasse
										platea dictumst. Maecenas nec orci vel sapien consectetur
										rutrum. Morbi quis nulla lacus.
									</div>
								</div>
							</div>
						</div>

						{/* Bottom section with size selection, quantity, and claim button */}
						<div className="self-stretch flex flex-col justify-start items-center gap-11 flex-1">
							{/* Size selection and quantity section */}
							<div className="self-stretch flex flex-col justify-start items-start gap-4">
								{/* Size selection */}
								<div className="self-stretch flex flex-col justify-start items-start gap-[3px]">
									{/* Size label */}
									<div className="self-stretch inline-flex justify-center items-center gap-2.5">
										<div className="flex-1 justify-start text-Tertiary text-base font-semibold font-['Open_Sans'] tracking-tight">
											Size:
										</div>
									</div>
									{/* Size selector using ButtonSwitch component */}
									<div className="w-full h-9 relative">
										<ButtonSwitch
											options={sizeOptions}
											value={selectedSize}
											onValueChange={setSelectedSize}
											className="w-full h-9"
										/>
									</div>
								</div>

								{/* Quantity and cost section */}
								<div className="self-stretch h-11 flex flex-col justify-center items-center gap-1">
									<div className="self-stretch inline-flex justify-center items-center gap-1.5">
										{/* Cost display */}
										<div className="flex-1 self-stretch flex justify-center items-center gap-2.5">
											<div className="flex-1 self-stretch justify-center text-Primary text-xs font-bold font-['Open_Sans'] tracking-tight">
												Cost: {totalCost} Scotty Coins
												{!hasEnoughCoins && <br />}
												{!hasEnoughCoins && "Not Enough Scotty Coins"}
											</div>
										</div>
										{/* Quantity selector */}
										<div className="px-2.5 py-2 bg-white rounded-[35px] outline outline-1 outline-offset-[-1px] outline-stone-500 flex justify-center items-center gap-2.5">
											{/* Decrement button */}
											<button
												type="button"
												onClick={handleDecrement}
												disabled={quantity <= 1}
												className="w-6 h-6 relative overflow-hidden flex items-center justify-center disabled:opacity-50"
											>
												<Minus className="w-4 h-4" />
											</button>
											{/* Quantity display */}
											<div className="justify-start text-Primary text-base font-semibold font-['Open_Sans']">
												{quantity}
											</div>
											{/* Increment button */}
											<button
												type="button"
												onClick={handleIncrement}
												disabled={quantity >= (prize.stock || 1)}
												className="w-6 h-6 relative overflow-hidden flex items-center justify-center disabled:opacity-50"
											>
												<Plus className="w-4 h-4" />
											</button>
										</div>
									</div>
								</div>
							</div>

							{/* Claim button - removed shadow and made functional */}
							<div className="self-stretch h-12 inline-flex justify-center items-center">
								<button
									type="button"
									onClick={handleClaim}
									disabled={!hasEnoughCoins}
									className="flex-1 h-12 px-8 py-3 bg-Primary rounded-3xl flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-Primary/90 transition-colors"
								>
									<div className="text-center justify-start text-Highlight text-base font-bold font-['Open_Sans'] leading-normal">
										Claim
									</div>
								</button>
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
