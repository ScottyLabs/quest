import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import { adminMiddleware } from "@/lib/auth";

export const Route = createFileRoute("/verify")({
	beforeLoad: async ({ context }) => {
		return await adminMiddleware(context);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { user } = Route.useRouteContext();

	return (
		<PageLayout currentPath="/verify" user={user}>
			<div className="[view-transition-name:main-content]">
				Hello "/verify"!
			</div>
		</PageLayout>
	);
}
