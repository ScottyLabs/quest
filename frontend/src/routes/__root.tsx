import {
	createRootRouteWithContext,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { Navbar } from "@/components/navbar";
import { PageHeader } from "@/components/page-header";
import type { AuthContext } from "@/lib/auth";
import { categoryIdFromRoute, colorClasses } from "@/lib/data/categories";
import { pageObject, type ValidPath } from "@/lib/data/page";

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

	const usePageTemplate = !["/onboarding", "/login", "/dorm-select"].includes(
		currentPath,
	);

	// The "all" category (corresponding to "/") shares colors with other pages
	const categoryId = categoryIdFromRoute[currentPath] || "all";
	const pageColors = colorClasses[categoryId];

	// Use the "all category" (corresponding to "/") pageData for all categories
	const isCategoryPage =
		currentPath === "/" || currentPath.startsWith("/challenges/");
	const pageData = isCategoryPage ? pageObject["/"] : pageObject[currentPath];

	return (
		<div className={`h-full ${pageColors.secondary}`}>
			{usePageTemplate && (
				<PageHeader
					categoryId={categoryId}
					isCategoryPage={isCategoryPage}
					pageColors={pageColors}
					pageObject={pageData}
				/>
			)}

			<Outlet />

			{usePageTemplate && (
				<Navbar currentPath={currentPath} pageColors={pageColors} />
			)}
		</div>
	);
}
