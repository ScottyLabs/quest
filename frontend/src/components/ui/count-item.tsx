import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CountItemProps {
	/** The count value to display */
	count: number;
	/** The left icon to display */
	leftIcon?: ReactNode;
	/** The right icon to display */
	rightIcon?: ReactNode;
	/** The background color class (e.g., 'bg-white', 'bg-blue-500') */
	backgroundColor?: string;
	/** The text color class (e.g., 'text-black', 'text-white') */
	textColor?: string;
	/** The shadow color class (e.g., 'shadow-[0px_4px_0px_0px_rgba(103,103,103,1.00)]') */
	shadowColor?: string;
	/** The outline color class (e.g., 'outline-stone-500', 'outline-blue-500') */
	outlineColor?: string;
	/** Additional CSS classes */
	className?: string;
}

/**
 * CountItem component - A customizable count display with icons and configurable colors
 *
 * @example
 * ```tsx
 * import { CountItem } from "@/components/ui/count-item";
 * import { Minus, Plus } from "lucide-react";
 *
 * // Basic usage
 * <CountItem count={14} />
 *
 * // With icons and custom colors
 * <CountItem
 *   count={14}
 *   leftIcon={<Minus className="w-4 h-4" />}
 *   rightIcon={<Plus className="w-4 h-4" />}
 *   backgroundColor="bg-blue-500"
 *   textColor="text-white"
 *   shadowColor="shadow-[0px_4px_0px_0px_rgba(59,130,246,1.00)]"
 *   outlineColor="outline-blue-600"
 * />
 * ```
 */
export function CountItem({
	count,
	leftIcon,
	rightIcon,
	backgroundColor = "bg-white",
	textColor = "text-Primary",
	shadowColor = "shadow-[0px_4px_0px_0px_rgba(103,103,103,1.00)]",
	outlineColor = "outline-stone-500",
	className,
}: CountItemProps) {
	return (
		<div
			className={cn(
				"px-2.5 py-2 rounded-[35px] outline outline-1 outline-offset-[-1px] inline-flex justify-center items-center gap-2.5",
				backgroundColor,
				shadowColor,
				outlineColor,
				className,
			)}
		>
			{leftIcon && (
				<div className="w-6 h-6 relative overflow-hidden flex items-center justify-center">
					{leftIcon}
				</div>
			)}
			<div
				className={cn(
					"justify-start text-base font-semibold font-['Open_Sans']",
					textColor,
				)}
			>
				{count}
			</div>
			{rightIcon && (
				<div className="w-6 h-6 relative overflow-hidden flex items-center justify-center">
					{rightIcon}
				</div>
			)}
		</div>
	);
}
