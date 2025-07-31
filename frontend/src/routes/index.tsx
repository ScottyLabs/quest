import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context.baseUrl);
	},
	component: Index,
});

function Index() {
	const { user } = Route.useRouteContext();

	return (
		<div className="p-6">
			<h1 className="text-xl">Welcome back, {user.name}!</h1>
			<p>Your groups: {user.groups.join(", ")}</p>
			<p>Your ScottyCoins: {user.scotty_coins}</p>
			<p>Your dorm: {user.dorm}</p>
		</div>
	);
}
