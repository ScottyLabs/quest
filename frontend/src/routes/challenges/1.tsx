import { createFileRoute } from "@tanstack/react-router";
import { ChallengeCategory } from "@/components/challenges/category";
import { ChallengesLayout } from "@/components/challenges/layout";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/challenges/1")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context.baseUrl);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { user } = Route.useRouteContext();

	return (
		<ChallengesLayout>
			<ChallengeCategory categoryId="the-essentials" user={user} />
		</ChallengesLayout>
	);
}
