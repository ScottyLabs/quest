import ScottyCoin from "@/assets/scotty-coin.svg?react";
import PlusMinus from "@/components/trade/plus-minus";
import TransactionsList from "@/components/trade/transaction-list";
import type { components } from "@/lib/schema.gen";

interface RedeemProps {
	prizes: components["schemas"]["RewardResponse"][];
	prize: components["schemas"]["RewardResponse"];
	quantity: number;
	setQuantity: (quantity: number) => void;
	handleClaim: () => void;
	hasEnoughCoins: boolean;
}

export default function Redeem({
	prizes,
	prize,
	quantity,
	setQuantity,
	handleClaim,
	hasEnoughCoins,
}: RedeemProps) {
	return (
		<div className="flex flex-col items-center justify-center p-2 ">
			{(prizes.find((p) => p.name === prize.name)?.transaction_info
				?.transactions.length || 0) > 0 && (
				<div className="p-4 m-2 rounded-2xl bg-gray-200 w-full">
					<div className="text-2xl font-bold mb-4">Redeemed:</div>
					<TransactionsList prizes={prizes} prizeName={prize.name} />
				</div>
			)}
			<div className="flex flex-col p-4 rounded-xl bg-gray-200 w-full my-2">
				<div className="flex mt-4 font-bold text-2xl">Redeem More:</div>
				<div className="flex flex-col items-center bg-white p-4 my-4 rounded-lg shadow-md">
					<div className="mt-4 text-xl">
						Spend{"\u00A0"}
						<span className="font-bold rounded-lg px-2 py-1 bg-housing-1">
							{prize.cost * quantity}
							{"\u00A0"}
							<ScottyCoin className="inline-block -mt-1 w-7 h-7" />
						</span>
						{"\u00A0"}
						to redeem
						{"\u00A0"} 
						<span className="font-bold">
							{quantity} {prize.name}
							{quantity > 1 ? "s" : ""}
						</span>
						?
					</div >
					{prize.trade_limit > 1 && (
						<div className="flex flex-col items-center mt-3 mb-1 w-full">
						<PlusMinus
							value={quantity}
							onValueChange={setQuantity}
							max={
								prize.trade_limit -
								(prize.transaction_info.total_purchased || 0)
							}
							min={1}
						/>
						</div>
					)}
				</div>
				<button
					type="button"
					className="self-center card-selected border-4 border-default-selected bg-default text-white cursor-pointer w-80 h-20 inline-flex justify-center items-center mb-4 px-4 py-2 text-2xl font-extrabold rounded-2xl disabled:opacity-50"
					onClick={handleClaim}
					disabled={!hasEnoughCoins}
				>
					Redeem
				</button>
			</div>
		</div>
	);
}
