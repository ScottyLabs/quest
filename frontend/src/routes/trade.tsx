import { createFileRoute } from "@tanstack/react-router";
import { adminMiddleware } from "@/lib/auth";

export const Route = createFileRoute("/trade")({
	beforeLoad: async ({ context }) => {
		return await adminMiddleware(context.baseUrl);
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="[view-transition-name:main-content]">Hello "/trade"!</div>
	);
}
