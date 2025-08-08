import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { colorClasses } from "@/lib/data/categories";
import { navbarPages as allPages, type ValidPath } from "@/lib/data/page";
import type { components } from "@/lib/schema.gen";
import type { ValueOf } from "@/lib/utils";

interface NavbarProps {
	currentPath: ValidPath;
	pageColors: ValueOf<typeof colorClasses>;
	user: components["schemas"]["UserProfileResponse"];
}

export function Navbar({ currentPath, pageColors, user }: NavbarProps) {
	const pages = allPages.filter((page) => {
		// Show /terrier-trade if not admin, show /verify if admin
		if (user.groups.includes("O-Quest Admin")) {
			return page.label !== "Terrier Trade";
		}
		return page.label !== "Verify";
	});

	return (
		<div>
			<div className="fixed bottom-20 left-0 right-0 z-50 w-full h-16 bg-gradient-to-b from-transparent from-10% via-55% via-black/12 to-black/36 pointer-events-none" />
			<nav className="fixed [view-transition-name:navbar] bottom-0 left-0 right-0 flex justify-around items-center h-20">
				{pages.map((page) => {
					const activeStyles =
						(page.to === "/" &&
							(currentPath === "/" || currentPath.startsWith("/challenges"))) ||
						(page.to !== "/" && currentPath.startsWith(page.to))
							? pageColors.selected
							: pageColors.hover;

					const challengeStyles =
						page.label === "Challenges" ? "flex-[1.5]" : "flex-1";

					return (
						<Link
							key={page.label}
							to={page.to}
							className={`flex flex-col items-center justify-center h-full transition-colors min-w-0 ${activeStyles} ${challengeStyles}`}
						>
							{page.label === "Challenges" ? (
								<div className="flex items-center gap-2">
									<ChevronLeft size={24} className="text-white" />
									<page.Icon size={32} className="text-white" />
									<ChevronRight size={24} className="text-white" />
								</div>
							) : (
								<page.Icon size={32} className="text-white" />
							)}

							{page.label === "Challenges" && (
								<span className="mt-1 text-xs font-bold text-white">
									Challenges
								</span>
							)}
						</Link>
					);
				})}
			</nav>
		</div>
	);
}
