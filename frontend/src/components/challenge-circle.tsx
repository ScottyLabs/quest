import {
	Building2,
	Car,
	GraduationCap,
	MapPin,
	Trophy,
	Utensils,
} from "lucide-react";
import type { ChallengeCategoryData } from "@/lib/types";

interface ChallengeCircleProps {
	category: ChallengeCategoryData;
	size?: "sm" | "md" | "lg";
	showIcon?: boolean;
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
	sm: 20,
	md: 32,
	lg: 48,
};

export function ChallengeCircle({
	category,
	size = "md",
	showIcon = true,
}: ChallengeCircleProps) {
	const Icon =
		categoryIcons[category.name as keyof typeof categoryIcons] || Trophy;

	// Generate color variations based on the main color
	const mainColor = category.color;
	const lightColor = generateLightColor(mainColor);
	const darkColor = generateDarkColor(mainColor);

	return (
		<div
			className={`${sizeClasses[size]} rounded-full flex items-center justify-center`}
			style={{ backgroundColor: darkColor }}
		>
			<div
				className="w-3/4 h-3/4 rounded-full flex items-center justify-center"
				style={{ backgroundColor: lightColor }}
			>
				{showIcon && (
					<Icon
						size={iconSizes[size]}
						className="text-white"
						style={{ color: mainColor }}
					/>
				)}
			</div>
		</div>
	);
}

// Helper functions to generate color variations
function generateLightColor(hexColor: string): string {
	const color = hexToRgb(hexColor);
	if (!color) return hexColor;

	return rgbToHex(
		Math.min(255, color.r + 60),
		Math.min(255, color.g + 60),
		Math.min(255, color.b + 60),
	);
}

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
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
			}
		: null;
}

function rgbToHex(r: number, g: number, b: number): string {
	return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
