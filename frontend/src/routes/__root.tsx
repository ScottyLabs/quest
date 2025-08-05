import {
	createRootRouteWithContext,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { NavBar } from "@/components/navbar";
import type { AuthContext } from "@/lib/auth";
import type { ValidPath } from "@/main";

interface RouterContext {
	baseUrl: string;
	auth?: AuthContext;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: Root,
});

function Root() {
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname as ValidPath;

	const shouldShowNavbar = !["/onboarding", "/login", "/dorm-select"].includes(
		currentPath,
	);

	return (
		<>
			<Outlet />
			{shouldShowNavbar && <NavBar />}
		</>
	);
}
