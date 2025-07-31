import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context.baseUrl);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { user } = Route.useRouteContext();

	return (
		<div>
			<h1 className="text-challenge-1-selected">Hello, {user.name}</h1>
			<p>Dorm: {user.dorm}</p>
			<p>ScottyCoins: {user.scotty_coins}</p>
			<p>Groups: {user.groups.join(", ")}</p>
		</div>
	);
}
