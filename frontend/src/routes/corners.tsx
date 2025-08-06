import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChallengePrint } from "@/components/challenge-print";
import type { ChallengeData } from "@/lib/challenge-api";
import { useChallenges } from "@/lib/hooks/use-challenge-data";

export const Route = createFileRoute("/corners")({
	component: CornersPage,
});

function CornersPage() {
	const { data: challenges, loading, error } = useChallenges();
	const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);

	// Get the current challenge based on index
	const currentChallenge = challenges[currentChallengeIndex];

	// Map category names to color classes
	const getColorClasses = (categoryName: string) => {
		switch (categoryName) {
			case "The Essentials":
				return {
					bg: "bg-challenge-1",
					bgLight: "bg-challenge-1-light",
					bgSelected: "bg-challenge-1-selected",
					iconColor: "#ef3f56", // challenge-1 color
				};
			case "Campus of Bridges":
				return {
					bg: "bg-challenge-3",
					bgLight: "bg-challenge-3-light",
					bgSelected: "bg-challenge-3-selected",
					iconColor: "#008b52", // challenge-3 color
				};
			case "Corners of Carnegie":
				return {
					bg: "bg-challenge-4",
					bgLight: "bg-challenge-4-light",
					bgSelected: "bg-challenge-4-selected",
					iconColor: "#008bc1", // challenge-4 color
				};
			case "Let's Eat":
				return {
					bg: "bg-challenge-2",
					bgLight: "bg-challenge-2-light",
					bgSelected: "bg-challenge-2-selected",
					iconColor: "#fdb814", // challenge-2 color
				};
			case "Minor-Major Generals":
				return {
					bg: "bg-challenge-5",
					bgLight: "bg-challenge-5-light",
					bgSelected: "bg-challenge-5-selected",
					iconColor: "#008b9a", // challenge-5 color
				};
			case "Off-Campus":
				return {
					bg: "bg-challenge-6",
					bgLight: "bg-challenge-6-light",
					bgSelected: "bg-challenge-6-selected",
					iconColor: "#004281", // challenge-6 color
				};
			default:
				return {
					bg: "bg-challenge-4",
					bgLight: "bg-challenge-4-light",
					bgSelected: "bg-challenge-4-selected",
					iconColor: "#008bc1", // challenge-4 color
				};
		}
	};

	const colorClasses = getColorClasses(
		currentChallenge?.category || "Corners of Carnegie",
	);

	const handleHeaderClick = () => {
		if (challenges.length > 0) {
			setCurrentChallengeIndex(
				(prevIndex) => (prevIndex + 1) % challenges.length,
			);
		}
	};

	if (loading) {
		return (
			<div
				className={`min-h-screen ${colorClasses.bgLight} flex flex-col items-center justify-center p-4`}
			>
				<div className="text-center text-2xl font-bold">Loading...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div
				className={`min-h-screen ${colorClasses.bgLight} flex flex-col items-center justify-center p-4`}
			>
				<div className="text-center text-2xl font-bold text-red-600">
					Error: {error}
				</div>
			</div>
		);
	}

	if (challenges.length === 0) {
		return (
			<div
				className={`min-h-screen ${colorClasses.bgLight} flex flex-col items-center justify-center p-4`}
			>
				<div className="text-center text-2xl font-bold">
					No challenges available
				</div>
			</div>
		);
	}

	return (
		<div
			className={`min-h-screen ${colorClasses.bgLight} flex flex-col items-center justify-center z-[100] relative`}
		>
			<ChallengePrint
				challenge={currentChallenge || null}
				colorClasses={colorClasses}
				onHeaderClick={handleHeaderClick}
			/>
		</div>
	);
}
