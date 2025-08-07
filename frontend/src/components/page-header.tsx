import { Link } from "@tanstack/react-router";
import { Filter, Flag, Info } from "lucide-react";
import HeaderArc from "@/assets/header-arc.svg?react";
import ScottyCoin from "@/assets/scotty-coin.svg?react";
import { useApi } from "@/lib/api-context";
import {
	type CategoryId,
	categories,
	type colorClasses,
} from "@/lib/data/categories";
import type { pageObject } from "@/lib/data/page";
import type { ValueOf } from "@/lib/utils";

interface PageHeaderProps {
	categoryId: CategoryId;
	isCategoryPage: boolean;
	pageColors: ValueOf<typeof colorClasses>;
	pageObject: ValueOf<typeof pageObject>;
}

export function PageHeader({
	categoryId,
	isCategoryPage,
	pageColors,
	pageObject,
}: PageHeaderProps) {
	const { $api } = useApi();
	const { data } = $api.useQuery("get", "/api/profile");

	return (
		<>
			<div
				className={`relative flex flex-col items-center justify-center h-[145px] ${pageColors.primary}`}
			>
				<div className="w-full flex flex-row justify-between items-center px-6 z-1">
					<Link
						to="/"
						className="flex items-center bg-white rounded-full px-3 py-2 shadow-[0_3px_0_#bbb] text-sm font-bold gap-1 hover:bg-gray-50 transition-colors"
						aria-label="View Challenges"
					>
						<Flag size={18} className="text-red-600" />
						<span>
							{data?.challenges_completed.total ?? 0}/
							{data?.total_challenges.total ?? 0}
						</span>
					</Link>

					<Link
						to="/terrier-trade"
						className="flex items-center bg-white rounded-full px-3 py-2 shadow-[0_3px_0_#bbb] text-sm font-bold gap-1"
						aria-label="View Coins"
					>
						<ScottyCoin className="size-5" />
						<span>{data?.scotty_coins.current ?? 0}</span>
					</Link>
				</div>

				{/* Main icon row */}
				<div className="absolute z-2 flex flex-row items-center justify-center w-full my-2 ">
					<div className="flex flex-col items-center">
						<div
							className={`rounded-full p-3 border-4 text-white border-white shadow ${pageColors.primary}`}
						>
							<pageObject.Icon className="size-10" />
						</div>
					</div>
				</div>

				{/* Decorative arc with title inside */}
				<div className="w-full overflow-hidden absolute h-[50%] bottom-0">
					<HeaderArc className={`w-full h-full ${pageColors.arcColor}`} />

					{/* Title and components positioned inside the arc, below the icon */}
					<div className={`absolute inset-0 flex items-end px-6 pb-1`}>
						<div className="mx-auto flex flex-row gap-2">
							{isCategoryPage && (
								<>
									<button type="button" className="pt-0.5 cursor-pointer">
										<Filter className="text-white size-6" />
									</button>
									<span className="text-white my-auto">&middot;</span>
								</>
							)}

							<span className="font-extrabold text-2xl text-center text-white">
								{pageObject.label}
							</span>

							{isCategoryPage && (
								<>
									<span className="text-white my-auto">&middot;</span>
									<button type="button" className="pt-0.5 cursor-pointer">
										<Info className="text-white size-6" />
									</button>
								</>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Challenge category bar */}
			{isCategoryPage && (
				<div className="flex flex-row px-4 mt-4 w-screen mb-2 [scrollbar-width:none] overflow-x-scroll">
					<div className="flex-grow" />

					<div className="flex shrink-0 gap-2">
						{categories.map((category) => (
							<Link
								key={category.label}
								to={category.to}
								className={`px-3 py-1 text-white font-bold text-nowrap rounded-md text-sm transition-colors ${categoryId === category.id && pageColors.selected}`}
							>
								{category.label}
							</Link>
						))}
					</div>

					<div className="flex-grow" />
				</div>
			)}
		</>
	);
}
