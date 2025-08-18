import {
	createFileRoute,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { type TouchEventHandler, useState } from "react";
import { Navbar } from "@/components/navbar";
import { PageHeader } from "@/components/page-header";
import { useApi } from "@/lib/app-context";
import { type CategoryId, colorClasses } from "@/lib/data/categories";
import { pageObject } from "@/lib/data/page";
import type { FileRoutesByFullPath } from "@/routeTree.gen";

function getCategoryId(path: string): CategoryId | undefined {
	const pathSplits = path.split("/");
	if (pathSplits[1] === "challenges") {
		return (pathSplits[2] as CategoryId) || "all";
	}
	return undefined;
}

export const Route = createFileRoute("/_layout")({
	component: PageLayout,
});

const fileRoutes = [
	"/profile",
	"/leaderboard",
	"/challenges/$categoryId",
	"/terrier-trade",
	"/about",
];

export function PageLayout() {
	const currentPathname = useLocation().pathname;
	const categoryId = getCategoryId(currentPathname);
	const navigate = useNavigate();

	const currentFileRoute = (
		categoryId ? "/challenges/$categoryId" : currentPathname
	) as keyof FileRoutesByFullPath;

	const handleSwipeRight = () => {
		let newPathName =
			fileRoutes[fileRoutes.findIndex((n) => n === currentFileRoute) - 1] ||
			"/profile";
		if (newPathName.startsWith("/challenges/")) {
			newPathName = "/challenges/all";
		}
		navigate({ to: newPathName });
	};

	const handleSwipeLeft = () => {
		let newPathName =
			fileRoutes[fileRoutes.findIndex((n) => n === currentFileRoute) + 1] ||
			"/about";
		if (newPathName.startsWith("/challenges/")) {
			newPathName = "/challenges/all";
		}
		navigate({ to: newPathName });
	};

	const [touchStartX, setTouchStartX] = useState<number | null>(null);
	const [touchEndX, setTouchEndX] = useState<number | null>(null);
	const [touchStartY, setTouchStartY] = useState<number | null>(null);
	const [touchEndY, setTouchEndY] = useState<number | null>(null);

	// the required distance between touchStart and touchEnd to be detected as a swipe
	const minSwipeDistance = 100;

	const onTouchStart: TouchEventHandler<HTMLDivElement> = (e) => {
		setTouchEndX(null); // otherwise the swipe is fired even with usual touch events
		setTouchStartX(e?.targetTouches[0]?.clientX || null);
		setTouchEndY(null);
		setTouchStartY(e?.targetTouches[0]?.clientY || null);
	};

	const onTouchMove: TouchEventHandler<HTMLDivElement> = (e) => {
		setTouchEndX(e?.targetTouches[0]?.clientX || null);
		setTouchEndY(e?.targetTouches[0]?.clientY || null);
	};

	const onTouchEnd = () => {
		if (!touchStartX || !touchEndX || !touchStartY || !touchEndY) return;
		const distanceX = touchStartX - touchEndX;
		const distanceY = touchStartY - touchEndY;

		if (Math.abs(distanceX) < Math.abs(distanceY)) {
			return;
		}

		const isLeftSwipe = distanceX > minSwipeDistance;
		const isRightSwipe = distanceX < -minSwipeDistance;
		if (isLeftSwipe) {
			handleSwipeLeft();
		} else if (isRightSwipe) {
			handleSwipeRight();
		}
	};

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

			<div
				className="overflow-scroll h-full pb-24 z-1"
				onTouchStart={onTouchStart}
				onTouchMove={onTouchMove}
				onTouchEnd={onTouchEnd}
			>
				<Outlet />
			</div>

			<Navbar currentPath={currentFileRoute} pageColors={pageColors} />
		</div>
	);
}
