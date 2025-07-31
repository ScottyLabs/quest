import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { Navbar } from "@/components/navbar";

interface RouterContext {
	baseUrl: string;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: Root,
});

function Root() {
	return (
		<>
			<Navbar />
			<Outlet />
		</>
	);
}
