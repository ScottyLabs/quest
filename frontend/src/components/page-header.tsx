import { Link } from "@tanstack/react-router";
import { Filter, Flag, Info } from "lucide-react";
import { useState } from "react";
import HeaderArc from "@/assets/header-arc.svg?react";
import ScottyCoin from "@/assets/scotty-coin.svg?react";
import { FilterCard, useFilter } from "@/components/challenges";
import { InfoDialog } from "@/components/challenges/info-dialog";
import { ModePill } from "@/components/mode-pill";
import {
	type CategoryId,
	categories,
	categoryIconFromId,
	type colorClasses,
} from "@/lib/data/categories";
import type { pageObject } from "@/lib/data/page";
import type { components } from "@/lib/schema.gen";
import type { ValueOf } from "@/lib/utils";

interface PageHeaderProps {
	categoryId?: CategoryId;
	pageColors: ValueOf<typeof colorClasses>;
	pageObject: ValueOf<typeof pageObject>;
	user: components["schemas"]["UserProfileResponse"];
}

export function PageHeader({
	categoryId,
	pageColors,
	pageObject,
	user,
}: PageHeaderProps) {
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [isInfoOpen, setIsInfoOpen] = useState(false);
	const { filter, setFilter } = useFilter();

	const Icon = categoryId ? categoryIconFromId[categoryId] : pageObject.Icon;

	return (
		<>
			<div
				className={`relative flex flex-col items-center justify-center h-[145px] ${pageColors.primary}`}
			>
				<div className="absolute top-6 w-full flex flex-row justify-between items-center px-6">
					<Link
						to="/challenges/$categoryId"
						params={{ categoryId: "all" }}
						className="flex card-primary items-center w-20 justify-center bg-white hover:bg-gray-100 rounded-full px-3 py-2 text-sm font-bold gap-1"
						aria-label="View Challenges"
					>
						<Flag size={18} className="text-red-600" />
						<span>
							{user.challenges_completed.total ?? 0}/
							{user.total_challenges.total ?? 0}
						</span>
					</Link>

					<div className="flex gap-2">
						<ModePill isAdmin={user.groups.includes("O-Quest Admin")} />
						<Link
							to="/terrier-trade"
							className="flex card-primary items-center w-20 justify-center bg-white hover:bg-gray-100 rounded-full px-3 py-2 text-sm font-bold gap-2"
							aria-label="View Coins"
						>
							<ScottyCoin className="size-5" />
							<span>{user.scotty_coins.current ?? 0}</span>
						</Link>
					</div>
				</div>

				{/* Main icon row */}
				<div className="pointer-events-none absolute z-2 flex flex-row items-center justify-center w-full my-2 ">
					<div className="flex flex-col items-center">
						<div
							className={`rounded-full p-3 border-4 text-white border-white shadow ${pageColors.primary}`}
						>
							<Icon className="size-10" />
						</div>
					</div>
				</div>
				{/* Decorative arc with title inside */}
				<div className="w-full overflow-hidden absolute h-[50%] bottom-0">
					<HeaderArc className={`w-full h-full ${pageColors.arcColor}`} />

					{/* Title and components positioned inside the arc, below the icon */}
					<div className={`absolute inset-0 flex items-end px-6 pb-1`}>
						<div className="mx-auto flex flex-row gap-2">
							{categoryId && (
								<>
									<button
										type="button"
										className="pt-0.5 cursor-pointer"
										onClick={() => setIsFilterOpen(true)}
									>
										<Filter className="text-white size-6" />
									</button>
									<span className="text-white my-auto">&middot;</span>
								</>
							)}

							<span className="font-extrabold text-2xl text-center text-white">
								{pageObject.label}
							</span>

							{categoryId && (
								<>
									<span className="text-white my-auto">&middot;</span>
									<button
										type="button"
										className="pt-0.5 cursor-pointer"
										onClick={() => setIsInfoOpen(true)}
									>
										<Info className="text-white size-6" />
									</button>
								</>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Challenge category bar */}
			{categoryId && (
				<div className="flex flex-row px-4 mt-4 w-screen mb-2 [scrollbar-width:none] overflow-x-scroll">
					<div className="flex-grow" />

					<div className="flex shrink-0 gap-2">
						{categories.map((category) => (
							<Link
								key={category.label}
								to="/challenges/$categoryId"
								params={{ categoryId: category.id }}
								className={`px-3 py-1 text-white font-bold text-nowrap rounded-md text-sm transition-colors ${categoryId === category.id && pageColors.selected}`}
							>
								{category.label}
							</Link>
						))}
					</div>

					<div className="flex-grow" />
				</div>
			)}

			{/* Filter Card */}
			{categoryId && (
				<FilterCard
					isOpen={isFilterOpen}
					onClose={() => setIsFilterOpen(false)}
					selectedFilter={filter}
					onFilterChange={setFilter}
				/>
			)}

			{/* Info Dialog */}
			{categoryId && (
				<InfoDialog
					isOpen={isInfoOpen}
					onOpenChange={setIsInfoOpen}
					pageObjectLabel={pageObject.label}
				/>
			)}
		</>
	);
}
