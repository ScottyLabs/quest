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
		<div className="flex self-center items-center p-1 rounded-3xl bg-gray-200">
			<button
				type="button"
				className="flex-1 min-w-14 p-2 bg-white rounded-l-2xl"
				onClick={() => onValueChange(Math.max(value - 1, min))}
			>
				<Minus className="w-4 h-4 mx-auto" />
			</button>
			<input
				type="number"
				value={value}
				onChange={(e) =>
					onValueChange(Math.min(max, Math.max(min, Number(e.target.value))))
				}
				className="max-w-14 w-auto text-center px-2"
			/>
			<button
				type="button"
				className="flex-1 min-w-14 p-2 bg-white rounded-r-2xl"
				onClick={() => onValueChange(Math.min(value + 1, max))}
			>
				<Plus className="w-4 h-4 mx-auto" />
			</button>
		</div>
	);
}
