import { createFileRoute } from "@tanstack/react-router";
import { ChallengeCategory } from "@/components/challenges/category";
import { ChallengesLayout } from "@/components/challenges/layout";
import { PageLayout } from "@/components/page-layout";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/challenges/2")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { user } = Route.useRouteContext();

	return (
		<PageLayout currentPath="/challenges/2" user={user}>
			<ChallengesLayout>
				<ChallengeCategory categoryId="campus-of-bridges" user={user} />
			</ChallengesLayout>
		</PageLayout>
	);
}
