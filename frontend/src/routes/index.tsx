import { createFileRoute } from "@tanstack/react-router";
import { ChallengeCategory } from "@/components/challenges/category";
import { ChallengesLayout } from "@/components/challenges/layout";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context);
	},
	component: Challenges,
});

function Challenges() {
	const { user } = Route.useRouteContext();

	return (
		<ChallengesLayout>
			<ChallengeCategory categoryId="all" user={user} />
		</ChallengesLayout>
	);
}
