interface Prize {
	name: string;
	cost: number;
	claimed: number;
	allowedToClaim: number;
	remaining: number;
	total: number;
	imageUrl: string;
}

export function PrizeCard({ prize }: { prize: Prize }) {
	const isMaxClaimed = prize.claimed === prize.allowedToClaim;

	return (
		<div
			className={
				"flex flex-row items-center justify-between border-2 border-black py-0"
			}
			style={isMaxClaimed ? { backgroundColor: "#e0e0e0" } : {}}
		>
			<div className="flex flex-col flex-1">
				<div className="pb-2">
					<div className="text-2xl font-bold wrap-anywhere">{prize.name}</div>
				</div>
				<div className="flex flex-row items-center justify-between">
					<div className="flex flex-col ">
						<p>Cost: {prize.cost} points</p>
						<p className={isMaxClaimed ? "text-red-500 font-semibold" : ""}>
							Claimed: {prize.claimed}/{prize.allowedToClaim}
						</p>
						<p>
							Remaining: {prize.remaining}/{prize.total}
						</p>
					</div>
				</div>
			</div>
			<div className="p-4">
				<img
					src={prize.imageUrl}
					alt={prize.name}
					className="w-32 h-32 object-cover rounded-md"
				/>
			</div>
		</div>
	);
}
