import type { PropsWithChildren } from "react";
import { Navbar } from "@/components/navbar";
import { PageHeader } from "@/components/page-header";
import { type CategoryId, colorClasses } from "@/lib/data/categories";
import { pageObject, type ValidPath } from "@/lib/data/page";
import type { components } from "@/lib/schema.gen";

interface PageLayoutProps {
	currentPath: ValidPath;
	categoryId?: CategoryId;
	showPageHeader?: boolean;
	user: components["schemas"]["UserProfileResponse"];
}

export function PageLayout({
	currentPath,
	categoryId,
	showPageHeader = true,
	user,
	children,
}: PropsWithChildren<PageLayoutProps>) {
	const pageData = pageObject[currentPath];

	// The "all" category (corresponding to "/") shares colors with other pages
	const pageColors = colorClasses[categoryId || "all"];

	// Use profile background color for profile page
	const backgroundColor =
		currentPath === "/profile" ? "bg-[#F3E9D2]" : pageColors.secondary;

	return (
		<div className={`min-h-screen ${backgroundColor}`}>
			{showPageHeader && (
				<PageHeader
					categoryId={categoryId}
					pageColors={pageColors}
					pageObject={pageData}
					user={user}
				/>
			)}

			<div className="pb-32">{children}</div>

			<Navbar currentPath={currentPath} pageColors={pageColors} />
		</div>
	);
}
