import {
	Building2,
	Car,
	GraduationCap,
	MapPin,
	Trophy,
	Utensils,
} from "lucide-react";
import type { ChallengeCategoryData } from "@/lib/types";
import circleSvg from "/images/icons/Circle.svg";

interface ChallengeCircleProps {
	category: ChallengeCategoryData;
	size?: "sm" | "md" | "lg";
	showIcon?: boolean;
	useBackgroundColor?: boolean;
	iconColor?: string;
}

const categoryIcons = {
	"The Essentials": Trophy,
	"Let's Eat": Utensils,
	"Corners of Carnegie": MapPin,
	"Campus of Bridges": Building2,
	"Minor-Major Generals": GraduationCap,
	"Off-Campus": Car,
} as const;

const sizeClasses = {
	sm: "w-16 h-16",
	md: "w-24 h-24",
	lg: "w-32 h-32",
};

const iconSizes = {
	sm: 16,
	md: 24,
	lg: 72,
};

export function ChallengeCircle({
	category,
	size = "lg",
	showIcon = true,
	useBackgroundColor = false,
	iconColor,
}: ChallengeCircleProps) {
	const Icon =
		categoryIcons[category.name as keyof typeof categoryIcons] || Trophy;

	// Generate color variations based on the main color
	const mainColor = category.color;

	// If useBackgroundColor is true, use the main color as background instead of generating variations
	const backgroundColor = useBackgroundColor
		? mainColor
		: generateDarkColor(mainColor);

	// Use custom icon color if provided, otherwise use the main color
	const finalIconColor = iconColor || mainColor;

	return (
		<div
			className={`${sizeClasses[size]} relative flex items-center justify-center`}
		>
			{/* White outer circle using SVG */}
			<div className="absolute inset-0 flex items-center justify-center">
				<img
					src={circleSvg}
					alt="White circle background"
					className="w-full h-full object-contain"
				/>
			</div>

			{/* Icon positioned in the center */}
			{showIcon && (
				<div className="relative z-10 flex items-center justify-center">
					<Icon size={iconSizes[size]} style={{ color: finalIconColor }} />
				</div>
			)}
		</div>
	);
}

// Helper functions to generate color variations
function generateDarkColor(hexColor: string): string {
	const color = hexToRgb(hexColor);
	if (!color) return hexColor;

	return rgbToHex(
		Math.max(0, color.r - 40),
		Math.max(0, color.g - 40),
		Math.max(0, color.b - 40),
	);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result || !result[1] || !result[2] || !result[3]) return null;

	const r = parseInt(result[1], 16);
	const g = parseInt(result[2], 16);
	const b = parseInt(result[3], 16);

	if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

	return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
	return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
