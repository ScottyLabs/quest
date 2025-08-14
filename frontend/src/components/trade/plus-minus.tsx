import { Minus, Plus } from "lucide-react";

export default function PlusMinus({
	value,
	onValueChange,
	min,
	max,
}: {
	value: number;
	onValueChange: (value: number) => void;
	min: number;
	max: number;
	thumbClassName?: string;
}) {
	return (
		<div className="flex self-center items-center p-1 rounded-md bg-gray-200">
			<button
				type="button"
				className="p-2 bg-white rounded-l-md"
				onClick={() => onValueChange(Math.max(value - 1, min))}
			>
				<Minus className="w-4 h-4" />
			</button>
			<input
				type="number"
				value={value}
				onChange={(e) =>
					onValueChange(Math.min(max, Math.max(min, Number(e.target.value))))
				}
				className="w-8 text-center borderrounded-md"
			/>
			<button
				type="button"
				className="p-2 bg-white rounded-r-md"
				onClick={() => onValueChange(Math.min(value + 1, max))}
			>
				<Plus className="w-4 h-4" />
			</button>
		</div>
	);
}
