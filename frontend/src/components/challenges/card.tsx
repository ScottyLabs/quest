import { Check, Lock } from "lucide-react";
import CheckContainer from "@/assets/check-container.svg?react";
import ScottyCoin from "@/assets/scotty-coin.svg?react";
import type { Challenge } from "@/components/challenges/layout";
import {
	type CategoryId,
	type CategoryLabel,
	categoryIdFromLabel,
	colorClasses,
} from "@/lib/data/categories";

interface ChallengeCardProps {
	categoryId: CategoryId;
	challenge: Challenge;
	isLast: boolean;
}

export function ChallengeCard({
	challenge,
	categoryId,
	isLast,
}: ChallengeCardProps) {
	// Ensure we're getting the category's challenge color even when the page is "all"
	if (categoryId === "all") {
		categoryId = categoryIdFromLabel[challenge.category as CategoryLabel];
	}

	const primaryColor = colorClasses[categoryId].primary;

	// TODO: remove this in prod
	const rand = Math.random();
	challenge.status =
		rand < 0.3 ? "completed" : rand < 0.6 ? "locked" : "available";

	const card =
		challenge.status === "completed" ? (
			<div className="rounded-2xl p-4 bg-success-light hover:bg-success-hover cursor-pointer transition-colors flex flex-row gap-2">
				{/* Check icon */}
				<div className="relative my-auto size-12">
					<CheckContainer className="absolute size-full" />
					<Check className="text-white size-1/2 stroke-4 absolute z-10 -translate-x-1/2 -translate-y-3/8 left-1/2 top-1/2" />
				</div>

				<div className="pl-4 flex-grow my-auto">
					<h1 className="text-xl text-success font-bold line-through">
						{challenge.name}
					</h1>
				</div>
			</div>
		) : challenge.status === "locked" ? (
			<div className="rounded-2xl p-4 bg-locked-light flex flex-row gap-2">
				{/* Locked icon */}
				<div className="relative -m-1 size-12 my-auto shrink-0">
					<div
						className={`absolute size-7/8 left-1/8 top-1/16 -rotate-20 rounded-lg bg-locked`}
					/>
				</div>

				<div className="pl-4 my-auto flex-grow">
					<h1 className="font-bold text-white">Mystery Challenge</h1>
					<p className="text-xs text-gray-400">
						Unlocks at {new Date(challenge.unlock_timestamp).toLocaleString()}
					</p>
				</div>
			</div>
		) : (
			/* challenge.status === "available" */
			<div className="relative rounded-2xl p-4 bg-white hover:bg-gray-100 cursor-pointer transition-colors flex flex-row gap-4">
				{/* Category icon */}
				<div className="relative -m-1 size-12 my-auto shrink-0">
					<div
						className={`absolute size-7/8 left-1/8 top-1/16 -rotate-20 rounded-lg ${primaryColor}`}
					/>
				</div>

				<div className="pl-4 my-auto flex-grow">
					<h1 className="font-bold max-w-7/8">{challenge.name}</h1>
					<p className="text-xs text-gray-500">{challenge.tagline}</p>
				</div>

				<div className="absolute right-4 my-auto flex gap-1">
					<ScottyCoin className="size-5 my-auto" />
					<p className="text-sm font-bold">+{challenge.scotty_coins}</p>
				</div>
			</div>
		);

	const iconColor =
		challenge.status === "completed"
			? "bg-success"
			: challenge.status === "locked"
				? "bg-locked"
				: primaryColor;

	return (
		<div className="flex flex-row gap-6">
			<div className="shrink-0 my-auto">
				<div
					className={`relative size-10 rounded-full border-4 border-white shadow-[0_3px_0_#bbb] ${iconColor}`}
				>
					{challenge.status === "completed" ? (
						<Check className="absolute left-1/4 top-1/4 text-white size-1/2 stroke-4" />
					) : (
						challenge.status === "locked" && (
							<Lock className="absolute left-1/4 top-1/4 text-white size-1/2 stroke-3" />
						)
					)}

					{!isLast && (
						<div className="-z-10 absolute border-l-2 border-white border-dashed h-24 top-full left-[calc(50%-1px)]" />
					)}
				</div>
			</div>
			<div className="flex-grow">{card}</div>
		</div>
	);
}
