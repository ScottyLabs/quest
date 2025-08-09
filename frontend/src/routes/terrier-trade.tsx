import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import { PrizeList } from "@/components/trade/prize-list";
// import { useApi } from "@/lib/api-context";
import { adminMiddleware } from "@/lib/auth";

export const Route = createFileRoute("/terrier-trade")({
	beforeLoad: async ({ context }) => {
		return await adminMiddleware(context);
	},
	component: TerrierTrade,
});

function TerrierTrade() {
	const { user } = Route.useRouteContext();
	// const { $api } = useApi();

	// Mock data instead of API query
	const mockPrizes = [
		{
			name: "Terrier Scarf",
			cost: 150,
			claimed: 1,
			allowedToClaim: 2,
			remaining: 10,
			total: 35,
			imageUrl: "",
			stock: 10,
			transaction_info: {
				total_purchased: 1,
				complete_count: 1,
				incomplete_count: 0,
			},
		},
		{
			name: "Scotty Mug",
			cost: 75,
			claimed: 0,
			allowedToClaim: 1,
			remaining: 15,
			total: 35,
			imageUrl: "",
			stock: 15,
			transaction_info: {
				total_purchased: 0,
				complete_count: 0,
				incomplete_count: 0,
			},
		},
		{
			name: "CMU Hoodie",
			cost: 300,
			claimed: 2,
			allowedToClaim: 3,
			remaining: 5,
			total: 35,
			imageUrl: "",
			stock: 5,
			transaction_info: {
				total_purchased: 2,
				complete_count: 2,
				incomplete_count: 0,
			},
		},
		{
			name: "Carnegie Cup Points",
			cost: 100,
			claimed: 0,
			allowedToClaim: 5,
			remaining: 1000,
			total: 1000,
			imageUrl: "",
			stock: 1000,
			transaction_info: {
				total_purchased: 0,
				complete_count: 0,
				incomplete_count: 0,
			},
		},
	];

	// Commented out API query
	// const {
	// 	data: prizeData,
	// 	isLoading,
	// 	error,
	// } = $api.useQuery("get", "/api/rewards", {});

	// if (isLoading) {
	// 	return (
	// 		<PageLayout currentPath="/terrier-trade" user={user}>
	// 			<div className="p-4 max-w-xl mx-auto flex flex-col gap-8">
	// 				<div className="text-center">Loading prizes...</div>
	// 			</div>
	// 		</PageLayout>
	// 	);
	// }

	// if (error) {
	// 	return (
	// 		<PageLayout currentPath="/terrier-trade" user={user}>
	// 			<div className="p-4 max-w-xl mx-auto flex flex-col gap-8">
	// 				<div className="text-center text-red-500">
	// 					Error loading prizes. Please try again.
	// 				</div>
	// 			</div>
	// 		</PageLayout>
	// 	);
	// }

	// const prizes =
	// 	prizeData?.rewards?.map((reward) => ({
	// 		name: reward.name,
	// 		cost: reward.cost,
	// 		claimed: reward.transaction_info.complete_count,
	// 		allowedToClaim: reward.trade_limit,
	// 		remaining: reward.stock,
	// 		total: 35, // Default total
	// 		imageUrl: "", // No image URL in API response
	// 		stock: reward.stock,
	// 		transaction_info: reward.transaction_info,
	// 	})) || [];

	return (
		<PageLayout currentPath="/terrier-trade" user={user}>
			<div className="[view-transition-name:main-content]">
				<div className="px-4 pt-6 max-w-2xl mx-auto">
					{mockPrizes.length === 0 ? (
						<div className="text-center text-gray-500">
							No prizes available at the moment.
						</div>
					) : (
						<PrizeList prizes={mockPrizes} />
					)}
				</div>
			</div>
		</PageLayout>
	);
}
