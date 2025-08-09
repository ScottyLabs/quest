interface ProgressProps {
	value: number;
	max: number;
	className?: string;
	bgColor?: string;
	progressColor?: string;
}

export function Progress({
	value,
	max,
	className = "",
	bgColor = "bg-neutral-700",
	progressColor = "bg-amber-400",
}: ProgressProps) {
	const percentage = Math.min((value / max) * 100, 100);
	const progressWidth = Math.max((percentage / 100) * 176, 0); // 176px is w-44 (11rem)

	return (
		<div className={`inline-flex justify-start items-center ${className}`}>
			<div
				className={`w-4 h-4 origin-top-left rotate-180 ${bgColor} rounded-full`}
			></div>
			<div className="p-2.5 inline-flex flex-col justify-start items-start gap-2.5">
				<div
					className={`h-4 ${progressColor} transition-all duration-300`}
					style={{ width: `${progressWidth}px`, minWidth: "8px" }}
				></div>
			</div>
			<div className={`w-4 h-4 ${bgColor} rounded-full`}></div>
		</div>
	);
}
