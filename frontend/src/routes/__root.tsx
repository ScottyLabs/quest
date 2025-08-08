import {
	createRootRouteWithContext,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { createContext, useContext, useState } from "react";
import type { FilterOption } from "@/components/filter-card";
import { Navbar } from "@/components/navbar";
import { PageHeader } from "@/components/page-header";
import type { AuthContext } from "@/lib/auth";
import { categoryIdFromRoute, colorClasses } from "@/lib/data/categories";
import { pageObject, type ValidPath } from "@/lib/data/page";

interface RouterContext {
	baseUrl: string;
	auth?: AuthContext;
}

interface FilterContextType {
	selectedFilter: FilterOption;
	setSelectedFilter: (filter: FilterOption) => void;
}

const FilterContext = createContext<FilterContextType | null>(null);

export const useFilter = () => {
	const context = useContext(FilterContext);
	if (!context) {
		throw new Error("useFilter must be used within a FilterProvider");
	}
	return context;
};

export const Route = createRootRouteWithContext<RouterContext>()({
	component: Root,
});

function Root() {
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname as ValidPath;
	const [selectedFilter, setSelectedFilter] = useState<FilterOption>("all");

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
		<FilterContext.Provider value={{ selectedFilter, setSelectedFilter }}>
			<div className={`min-h-screen ${pageColors.secondary}`}>
				{usePageTemplate && (
					<PageHeader
						categoryId={categoryId}
						isCategoryPage={isCategoryPage}
						pageColors={pageColors}
						pageObject={pageData}
						selectedFilter={selectedFilter}
						onFilterChange={setSelectedFilter}
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
			</div>
		</FilterContext.Provider>
	);
}
