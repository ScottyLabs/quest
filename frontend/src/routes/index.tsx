import { createFileRoute } from "@tanstack/react-router";
import { ChallengeCategory } from "@/components/category";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
	beforeLoad: async ({ context }) => {
		return await requireAuth(context.baseUrl);
	},
	component: Challenges,
});

function Challenges() {
	const { user } = Route.useRouteContext();

	return <ChallengeCategory categoryId="all" user={user} />;
}
