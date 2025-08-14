import { useState } from "react";
import { Drawer } from "vaul";
import Redeem from "@/components/trade/redeem";
import { Redeemed } from "@/components/trade/redeemed";
import { useApi } from "@/lib/app-context";
import type { components } from "@/lib/schema.gen";

interface TradeMenuProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	prize: components["schemas"]["RewardResponse"];
	adminMode: boolean;
}

export function TradeMenu({
	isOpen,
	onOpenChange,
	prize,
	adminMode,
}: TradeMenuProps) {
	const { $api } = useApi();

	const {
		data: { rewards: prizes } = { rewards: [] },
		refetch: refetchPrizes,
	} = $api.useQuery("get", "/api/rewards");

	const {
		data: {
			scotty_coins: { current: userCoins },
		} = { scotty_coins: { current: 0 } },
	} = $api.useQuery("get", "/api/profile");

	const {
		mutate: redeem,
		data: redeemData,
		reset: resetRedeem,
	} = $api.useMutation("post", "/api/transaction");
	const { message, success, transaction } = redeemData || {
		message: "",
		success: false,
		transaction: null,
	};
	// State for managing the selected size and quantity
	const [quantity, setQuantity] = useState<number>(1);

	// Check if user has enough coins
	const hasEnoughCoins = userCoins >= quantity * prize.cost;

	// Handle claim button click
	const handleClaim = () => {
		redeem({
			body: {
				count: quantity,
				reward_name: prize.name,
			},
		});
	};
	return (
		<Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
			<Drawer.Portal>
				<Drawer.Overlay className="z-50 fixed inset-0 bg-black/40" />
				<Drawer.Content className="z-50 bg-white flex flex-col fixed bottom-0 left-0 right-0 h-[82vh] p-6 rounded-t-2xl">
					<Drawer.Handle />
					<Drawer.Title className="text-2xl self-center font-bold mt-4">
						{adminMode ? "Verify" : "Trade for"} {prize.name}
					</Drawer.Title>
					{adminMode ? (
						<div className="flex flex-col items-center p-4 text-lg mb-4">
							<button
								type="button"
								className="self-center card-selected border-4 border-green-600 bg-green-400 text-white cursor-pointer w-80 h-20 inline-flex justify-center items-center mb-4 px-4 py-2 text-2xl font-extrabold rounded-2xl disabled:opacity-50"
								onClick={() => onOpenChange(false)}
							>
								Scan QR to Verify
							</button>
						</div>
					) : transaction ? (
						<Redeemed
							closeDrawer={() => {
								resetRedeem();
								refetchPrizes();
								onOpenChange(false);
							}}
							prize={{
								name: prize.name,
								amount: quantity,
								transaction_id: transaction.transaction_id,
							}}
						/>
					) : (
						<Redeem
							setDrawerOpen={onOpenChange}
							prizes={prizes}
							prize={prize}
							quantity={quantity}
							setQuantity={setQuantity}
							handleClaim={handleClaim}
							hasEnoughCoins={hasEnoughCoins}
						/>
					)}
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	);
}
