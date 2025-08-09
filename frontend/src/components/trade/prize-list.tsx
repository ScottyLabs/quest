import { PrizeCard } from "./prize-card";

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

interface PrizeListProps {
	prizes: Prize[];
}

export function PrizeList({ prizes }: PrizeListProps) {
	return (
		<div className="relative flex flex-col items-stretch w-full gap-6 max-w-full">
			{prizes.map((prize) => (
				<PrizeCard key={prize.name} prize={prize} />
			))}
		</div>
	);
}
