import { Check, Filter, Lock, X } from "lucide-react";
import ScottyCoin from "@/assets/scotty-coin.svg?react";
import { Button } from "@/components/ui/button";
import type { components } from "@/lib/schema.gen";

export type FilterOption = components["schemas"]["ChallengeStatus"] | "all";

const filterOptions: {
	value: FilterOption;
	label: string;
	icon: React.ReactNode;
}[] = [
	{
		value: "all",
		label: "All",
		icon: <Filter className="text-[#666] size-5" />,
	},
	{
		value: "available",
		label: "Available",
		icon: <ScottyCoin className="size-5" />,
	},
	{
		value: "completed",
		label: "Completed",
		icon: <Check className="text-success stroke-4 size-5" />,
	},
	{
		value: "locked",
		label: "Locked",
		icon: <Lock className="text-[#666] stroke-2 size-5" />,
	},
];

interface FilterCardProps {
	isOpen: boolean;
	onClose: () => void;
	selectedFilter: FilterOption;
	onFilterChange: (filter: FilterOption) => void;
}

export function FilterCard({
	isOpen,
	onClose,
	selectedFilter,
	onFilterChange,
}: FilterCardProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="bg-white rounded-2xl p-6 shadow-[0_3px_0_#bbb] max-w-sm w-full mx-4">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<Filter size={20} className="text-default" />
						<h3 className="font-bold text-lg text-gray-900">
							Filter Challenges
						</h3>
					</div>

					<Button
						variant="ghost"
						size="sm"
						onClick={onClose}
						className="p-1 hover:bg-gray-100 rounded-full"
					>
						<X size={20} />
					</Button>
				</div>

				<div className="space-y-2">
					{filterOptions.map((option) => (
						<button
							key={option.value}
							type="button"
							onClick={() => {
								onFilterChange(option.value);
								onClose();
							}}
							className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
								selectedFilter === option.value
									? "bg-gray-700 text-white"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							<div className="flex items-center justify-center w-5 h-5">
								{option.icon}
							</div>
							{option.label}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
