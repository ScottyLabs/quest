import { createFileRoute } from "@tanstack/react-router";
import { ChallengeCategory } from "@/components/challenges/category";
import { ChallengesLayout } from "@/components/challenges/layout";
import { PageLayout } from "@/components/page-layout";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/challenges/3")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { user } = Route.useRouteContext();

	return (
		<PageLayout currentPath="/challenges/3" user={user}>
			<ChallengesLayout>
				<ChallengeCategory categoryId="lets-eat" user={user} />
			</ChallengesLayout>
		</PageLayout>
	);
}
