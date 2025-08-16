import { type PropsWithChildren, Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { PageHeader } from "@/components/page-header";
import { type CategoryId, colorClasses } from "@/lib/data/categories";
import { pageObject, type ValidPath } from "@/lib/data/page";
import type { components } from "@/lib/schema.gen";

interface PageLayoutProps {
	currentPath: ValidPath;
	categoryId?: CategoryId;
	user: components["schemas"]["UserProfileResponse"];
}

export function PageLayout({
	currentPath,
	categoryId,
	user,
	children,
}: PropsWithChildren<PageLayoutProps>) {
	const pageData = pageObject[currentPath];

	// The "all" category (corresponding to "/") shares colors with other pages
	const pageColors = colorClasses[categoryId || "all"];

	return (
		<div
			className={`h-screen overflow-clip flex flex-col ${pageColors.secondary}`}
		>
			<PageHeader
				categoryId={categoryId}
				pageColors={pageColors}
				pageObject={pageData}
				user={user}
			/>

			<div className="overflow-scroll h-full pb-24 z-1">
				<Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
			</div>

			<Navbar currentPath={currentPath} pageColors={pageColors} />
		</div>
	);
}
