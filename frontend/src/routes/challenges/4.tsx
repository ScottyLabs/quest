import { createFileRoute } from "@tanstack/react-router";
import { ChallengeCategory } from "@/components/category";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/challenges/4")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context.baseUrl);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { user } = Route.useRouteContext();

	return (
		<ChallengeCategory categoryId="cool-corners-of-carnegie" user={user} />
	);
}
