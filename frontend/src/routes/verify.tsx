import { createFileRoute } from "@tanstack/react-router";
import { adminMiddleware } from "@/lib/auth";

export const Route = createFileRoute("/verify")({
	beforeLoad: async ({ context }) => {
		return await adminMiddleware(context);
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="[view-transition-name:main-content]">Hello "/verify"!</div>
	);
}
