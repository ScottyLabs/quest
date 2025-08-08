import type { PropsWithChildren } from "react";
import { FilterLayout } from "@/components/challenges/filter-layout";
import { Navbar } from "@/components/navbar";
import { PageHeader } from "@/components/page-header";
import { categoryIdFromRoute, colorClasses } from "@/lib/data/categories";
import { pageObject, type ValidPath } from "@/lib/data/page";
import type { components } from "@/lib/schema.gen";

interface PageLayoutProps {
	currentPath: ValidPath;
	user: components["schemas"]["UserProfileResponse"];
}

export function PageLayout({
	currentPath,
	user,
	children,
}: PropsWithChildren<PageLayoutProps>) {
	// The "all" category (corresponding to "/") shares colors with other pages
	const categoryId = categoryIdFromRoute[currentPath] || "all";
	const pageColors = colorClasses[categoryId];

	// Use the "all category" (corresponding to "/") pageData for all categories
	const isCategoryPage =
		currentPath === "/" || currentPath.startsWith("/challenges/");
	const pageData = isCategoryPage ? pageObject["/"] : pageObject[currentPath];

	return (
		<div className={`min-h-screen ${pageColors.secondary}`}>
			<FilterLayout>
				<PageHeader
					categoryId={categoryId}
					isCategoryPage={isCategoryPage}
					pageColors={pageColors}
					pageObject={pageData}
					user={user}
				/>

				<div className="pb-32">{children}</div>

				<Navbar currentPath={currentPath} pageColors={pageColors} user={user} />
			</FilterLayout>
		</div>
	);
}
