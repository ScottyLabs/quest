import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import { PrizeCard } from "@/components/trade/prize-card";
import { useApi } from "@/lib/app-context";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/terrier-trade")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context);
	},
	component: TerrierTrade,
});

function TerrierTrade() {
	const { user } = Route.useRouteContext();
	const { $api } = useApi();
	const { data: prizeData } = $api.useQuery("get", "/api/rewards");

	const prizes = prizeData?.rewards || [];
	const carnegieCupPrize = prizes.find(
		(prize) => prize.name === "Carnegie Cup Contribution",
	);
	const otherPrizes = prizes.filter(
		(prize) => prize.name !== "Carnegie Cup Contribution",
	);

	return (
		<PageLayout currentPath="/terrier-trade" user={user}>
			<div className="[view-transition-name:main-content]">
				<div className="px-4 pt-6 max-w-2xl mx-auto">
					<div className="relative flex flex-col items-stretch w-full gap-6 max-w-full">
						{(carnegieCupPrize // order carnegie cup prize first
							? [carnegieCupPrize, ...otherPrizes]
							: otherPrizes
						).map((prize) => (
							<PrizeCard key={prize.name} prize={prize} />
						))}
					</div>
				</div>
			</div>
		</PageLayout>
	);
}
