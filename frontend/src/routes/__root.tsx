import {
	createRootRouteWithContext,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { FilterLayout } from "@/components/challenges/filter-layout";
import { Navbar } from "@/components/navbar";
import { PageHeader } from "@/components/page-header";
import type { AuthContext } from "@/lib/auth";
import { categoryIdFromRoute, colorClasses } from "@/lib/data/categories";
import { pageObject, type ValidPath } from "@/lib/data/page";

export interface RouterContext {
	baseUrl: string;
	auth?: AuthContext;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: Root,
});

function Root() {
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname as ValidPath;

	const usePageTemplate = ![
		"/onboarding",
		"/login",
		"/dorm-select",
		"/camera-test",
	].includes(currentPath);

	// The "all" category (corresponding to "/") shares colors with other pages
	const categoryId = categoryIdFromRoute[currentPath] || "all";
	const pageColors = colorClasses[categoryId];

	// Use the "all category" (corresponding to "/") pageData for all categories
	const isCategoryPage =
		currentPath === "/" || currentPath.startsWith("/challenges/");
	const pageData = isCategoryPage ? pageObject["/"] : pageObject[currentPath];

	return (
		<div className={`min-h-screen ${pageColors.secondary}`}>
			{/* Both PageHeader and components/challenges/category.tsx need useFilterContext */}
			<FilterLayout>
				{usePageTemplate && (
					<PageHeader
						categoryId={categoryId}
						isCategoryPage={isCategoryPage}
						pageColors={pageColors}
						pageObject={pageData}
					/>
				)}

				{/* Space for fixed navbar and header */}
				<div
					className={usePageTemplate ? "pb-32 min-h-[calc(100vh-145px)]" : ""}
				>
					<Outlet />
				</div>

				{usePageTemplate && (
					<Navbar currentPath={currentPath} pageColors={pageColors} />
				)}
			</FilterLayout>
		</div>
	);
}
