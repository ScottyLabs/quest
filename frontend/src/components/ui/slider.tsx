import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps {
	value: number;
	min?: number;
	max?: number;
	step?: number;
	onValueChange?: (value: number) => void;
	className?: string;
	disabled?: boolean;
	showValue?: boolean;
	valueDisplay?: (value: number) => string;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
	(
		{
			value,
			min = 0,
			max = 100,
			step = 1,
			onValueChange,
			className,
			disabled = false,
			showValue = true,
			valueDisplay = (value) => value.toString(),
		},
		ref,
	) => {
		const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
			if (!disabled && onValueChange) {
				const newValue = parseFloat(event.target.value);
				onValueChange(newValue);
			}
		};

		const percentage = ((value - min) / (max - min)) * 100;

		return (
			<div
				ref={ref}
				className={cn(
					"flex flex-col gap-2 w-full",
					disabled && "opacity-50 cursor-not-allowed",
					className,
				)}
			>
				{showValue && (
					<div className="flex justify-between items-center">
						<span className="text-sm font-medium text-gray-700">
							{valueDisplay(value)}
						</span>
					</div>
				)}
				<div className="relative">
					<input
						type="range"
						min={min}
						max={max}
						step={step}
						value={value}
						onChange={handleChange}
						disabled={disabled}
						className={cn(
							"w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer",
							"focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2",
							disabled && "cursor-not-allowed",
							// Custom slider styling
							"[&::-webkit-slider-thumb]:appearance-none",
							"[&::-webkit-slider-thumb]:w-5",
							"[&::-webkit-slider-thumb]:h-5",
							"[&::-webkit-slider-thumb]:bg-amber-400",
							"[&::-webkit-slider-thumb]:rounded-full",
							"[&::-webkit-slider-thumb]:cursor-pointer",
							"[&::-webkit-slider-thumb]:shadow-lg",
							"[&::-webkit-slider-thumb]:border-2",
							"[&::-webkit-slider-thumb]:border-white",
							"[&::-moz-range-thumb]:w-5",
							"[&::-moz-range-thumb]:h-5",
							"[&::-moz-range-thumb]:bg-amber-400",
							"[&::-moz-range-thumb]:rounded-full",
							"[&::-moz-range-thumb]:cursor-pointer",
							"[&::-moz-range-thumb]:border-2",
							"[&::-moz-range-thumb]:border-white",
							"[&::-moz-range-thumb]:shadow-lg",
						)}
					/>
					{/* Custom track fill */}
					<div
						className="absolute top-0 left-0 h-2 bg-amber-400 rounded-lg pointer-events-none transition-all duration-200"
						style={{ width: `${percentage}%` }}
					/>
				</div>
			</div>
		);
	},
);

Slider.displayName = "Slider";

export { Slider };
