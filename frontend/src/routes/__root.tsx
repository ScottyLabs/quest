import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { AuthContext } from "@/lib/auth";

export interface RouterContext {
	baseUrl: string;
	queryClient: QueryClient;
	auth?: AuthContext;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: Root,
});

function Root() {
	return <Outlet />;
}
