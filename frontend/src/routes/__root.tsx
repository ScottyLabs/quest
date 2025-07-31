import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { Navbar } from "@/components/navbar";
import type { AuthContext } from "@/lib/auth";

interface RouterContext {
	baseUrl: string;
	auth?: AuthContext;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: Root,
});

function Root() {
	return (
		<>
			<Outlet />
			<Navbar />
		</>
	);
}
