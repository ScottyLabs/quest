import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonSwitchOption {
	value: string;
	label: string;
}

export interface ButtonSwitchProps {
	options: ButtonSwitchOption[];
	value?: string;
	onValueChange?: (value: string) => void;
	className?: string;
	size?: "sm" | "md" | "lg";
	disabled?: boolean;
}

const ButtonSwitch = React.forwardRef<HTMLDivElement, ButtonSwitchProps>(
	(
		{ options, value, onValueChange, className, size = "md", disabled = false },
		ref,
	) => {
		const handleOptionClick = (optionValue: string) => {
			if (!disabled && onValueChange) {
				onValueChange(optionValue);
			}
		};

		const handleKeyDown = (event: React.KeyboardEvent, optionValue: string) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				handleOptionClick(optionValue);
			}
		};

		const sizeClasses = {
			sm: "h-7 text-xs",
			md: "h-9 text-sm",
			lg: "h-11 text-base",
		};

		return (
			<div
				ref={ref}
				className={cn(
					"w-full p-0.5 bg-gray-100 rounded-lg shadow-[0px_4px_0px_0px_rgba(103,103,103,1.00)] outline outline-1 outline-offset-[-0.50px] outline-stone-500 inline-flex justify-center items-center",
					sizeClasses[size],
					disabled && "opacity-50 cursor-not-allowed",
					className,
				)}
				role="tablist"
				aria-label="Button switch"
			>
				{options.map((option, index) => {
					const isSelected = value === option.value;
					return (
						<button
							key={option.value}
							type="button"
							className={cn(
								"flex-1 self-stretch p-2 flex justify-center items-center gap-2.5 transition-all duration-200 border-none bg-transparent",
								isSelected
									? "bg-white rounded-md shadow-[0px_1px_2px_0px_rgba(0,0,0,0.16)]"
									: "hover:bg-gray-50",
								!disabled && "cursor-pointer",
								disabled && "cursor-not-allowed",
							)}
							onClick={() => handleOptionClick(option.value)}
							onKeyDown={(e) => handleKeyDown(e, option.value)}
							disabled={disabled}
							role="tab"
							aria-selected={isSelected}
							tabIndex={isSelected ? 0 : -1}
						>
							<div className="text-center justify-start text-black font-semibold font-['Inter'] leading-normal">
								{option.label}
							</div>
						</button>
					);
				})}
			</div>
		);
	},
);

ButtonSwitch.displayName = "ButtonSwitch";

export { ButtonSwitch };
