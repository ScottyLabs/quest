import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChallengePrint } from "@/components/challenge-print";
import { ChallengePrintFull } from "@/components/challenge-print-full";
import {
	useAllChallenges,
	useAllChallengesWithSecrets,
} from "@/lib/hooks/use-challenge-data";
import type { Challenge } from "@/lib/types";

export const Route = createFileRoute("/corners")({
	component: CornersPage,
});

// We'll use the useAllChallenges hook to get real data from the API

function CornersPage() {
	// Try admin endpoint first (with secrets), fallback to user endpoint
	const adminChallenges = useAllChallengesWithSecrets();
	const userChallenges = useAllChallenges();

	// Use admin data if available, otherwise fall back to user data
	const challenges = adminChallenges.data?.length
		? adminChallenges.data
		: userChallenges.data;
	const loading = adminChallenges.loading || userChallenges.loading;
	const error = adminChallenges.error || userChallenges.error;
	const debug = adminChallenges.data?.length
		? adminChallenges.debug
		: userChallenges.debug;

	// Debug: Log the current challenge
	console.log("All challenges:", challenges);
	console.log("Challenges length:", challenges?.length);
	console.log("Loading state:", loading);
	console.log("Error state:", error);
	console.log("Debug info:", debug);

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
		if (challenges && challenges.length > 0) {
			setCurrentChallengeIndex(
				(prevIndex) => (prevIndex + 1) % challenges.length,
			);
		}
	};

	// Show loading state
	if (loading) {
		return (
			<div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
				<div className="text-lg">Loading challenges...</div>
			</div>
		);
	}

	// Show error state
	if (error) {
		return (
			<div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
				<div className="text-lg text-red-600">Error: {error}</div>
			</div>
		);
	}

	// Show empty state
	if (!challenges || challenges.length === 0) {
		return (
			<div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
				<div className="text-lg">No challenges available</div>
				<div className="text-sm text-gray-600 mt-2">
					Debug: {JSON.stringify(debug)}
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
