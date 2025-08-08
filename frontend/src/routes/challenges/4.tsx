import { createFileRoute } from "@tanstack/react-router";
import { ChallengeCategory } from "@/components/challenges/category";
import { ChallengesLayout } from "@/components/challenges/layout";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/challenges/4")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { user } = Route.useRouteContext();

	return (
		<ChallengesLayout>
			<ChallengeCategory categoryId="cool-corners-of-carnegie" user={user} />
		</ChallengesLayout>
	);
}
