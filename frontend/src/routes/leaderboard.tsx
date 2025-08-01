import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/leaderboard")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context.baseUrl);
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="[view-transition-name:main-content]">
			Hello "/leaderboard"!
		</div>
	);
}
