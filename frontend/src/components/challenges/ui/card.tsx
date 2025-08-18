import { Check, Lock, Trophy } from "lucide-react";
import type { MouseEventHandler } from "react";
import CheckContainer from "@/assets/check-container.svg?react";
import {
	type CategoryLabel,
	categoryIconFromId,
	categoryIdFromLabel,
	colorClasses,
} from "@/lib/data/categories";
import type { components } from "@/lib/schema.gen";

export type Challenge =
	| components["schemas"]["AdminChallengeResponse"]
	| components["schemas"]["ChallengeResponse"];

interface ChallengeCardProps {
	challenge: Challenge;
	isLast: boolean;
	isVerifyMode?: boolean;
	onClick?: MouseEventHandler<HTMLDivElement>;
}

export function ChallengeCard({
	challenge,
	isLast,
	isVerifyMode,
	onClick,
}: ChallengeCardProps) {
	// Ensure we're getting the category's challenge color even when the page is "all"
	const thisId = categoryIdFromLabel?.[challenge.category as CategoryLabel];
	console.log("thisId", thisId);
	const primaryColor = colorClasses[thisId]?.primary;

	const CategoryIcon = categoryIconFromId?.[thisId];

	const card =
		isVerifyMode || challenge.status === "available" ? (
			<div className="card-primary rounded-2xl p-4 bg-white hover:bg-gray-100 cursor-pointer flex flex-row gap-4">
				{/* Category icon */}
				<div className="relative -m-1 size-12 my-auto shrink-0">
					<div
						className={`absolute size-7/8 left-1/8 top-1/16 -rotate-20 rounded-lg ${primaryColor}`}
					>
						<CategoryIcon className="absolute size-1/2 rotate-20 left-1/4 top-1/4 text-white" />
					</div>
				</div>

				<div className="pl-4 my-auto flex-grow">
					<h1 className="font-bold max-w-7/8">{challenge.name}</h1>
					<p className="text-xs text-gray-500">{challenge.tagline}</p>
				</div>
			</div>
		) : challenge.status === "completed" ? (
			<div className="card-success rounded-2xl p-4 bg-success-light hover:bg-success-hover cursor-pointer flex flex-row gap-2">
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
		) : (
			/* challenge.status === "locked" */
			<div className="card-locked rounded-2xl p-4 bg-locked-light flex flex-row gap-2">
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
		);

	const iconColor =
		isVerifyMode || challenge.status === "available"
			? primaryColor
			: challenge.status === "completed"
				? "bg-success"
				: "bg-locked";

	const Icon = !isVerifyMode
		? challenge.status === "available"
			? Trophy
			: challenge.status === "completed"
				? Check
				: Lock
		: null;

	return (
		<div className="flex flex-row gap-6">
			<div className="shrink-0 my-auto">
				<div
					className={`relative size-10 rounded-full border-4 border-white shadow-[0_3px_0_#bbb] ${iconColor}`}
				>
					{Icon && (
						<Icon className="absolute left-1/4 top-1/4 text-white size-1/2 stroke-3" />
					)}

					{!isLast && (
						<div className="-z-10 absolute border-l-2 border-white border-dashed h-24 top-full left-[calc(50%-1px)]" />
					)}
				</div>
			</div>

			{/** biome-ignore lint/a11y/noStaticElementInteractions: button component adds unwanted styles */}
			{/** biome-ignore lint/a11y/useKeyWithClickEvents: TODO */}
			<div className="flex-grow" onClick={onClick}>
				{card}
			</div>
		</div>
	);
}
