import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { Navbar } from "@/components/navbar";
import { PageHeader } from "@/components/page-header";
import { useApi } from "@/lib/app-context";
import { type CategoryId, colorClasses } from "@/lib/data/categories";
import { pageObject } from "@/lib/data/page";
import type { FileRoutesByFullPath } from "@/routeTree.gen";

function getCategoryId(path: string): CategoryId | undefined {
	const pathSplits = path.split("/");
	if (pathSplits[0] === "challenges") {
		return (pathSplits[1] as CategoryId) || "all";
	}
	return undefined;
}

export const Route = createFileRoute("/_layout")({
	component: PageLayout,
});

export function PageLayout() {
	const currentPathname = useLocation().pathname;
	const categoryId = getCategoryId(currentPathname);

	const currentFileRoute = (
		categoryId ? currentPathname : "/challenges/$categoryId"
	) as keyof FileRoutesByFullPath;

	const { $api } = useApi();
	const { data: user } = $api.useQuery("get", "/api/profile");

	const pageData = pageObject[currentFileRoute];

	// The "all" category (corresponding to "/") shares colors with other pages
	const pageColors = colorClasses[categoryId || "all"];

	return (
		<div
			className={`h-screen overflow-clip flex flex-col ${pageColors.secondary}`}
		>
			{user && (
				<PageHeader
					categoryId={categoryId}
					pageColors={pageColors}
					pageObject={pageData}
					user={user}
				/>
			)}

			<div className="overflow-scroll h-full pb-24 z-1">
				<Outlet />
			</div>

			<Navbar currentPath={currentFileRoute} pageColors={pageColors} />
		</div>
	);
}
