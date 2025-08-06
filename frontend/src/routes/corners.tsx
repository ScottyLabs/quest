import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChallengePrint } from "@/components/challenge-print";
import type { ChallengeData } from "@/lib/challenge-api";

export const Route = createFileRoute("/corners")({
	component: CornersPage,
});

// Temporary data with challenges for each category
const TEMP_CHALLENGES: ChallengeData[] = [
	// The Essentials - 2 challenges
	{
		name: "Find the Scotty Statue",
		category: "The Essentials",
		location: "Main Campus",
		secret: "SCOTTY123",
		scotty_coins: 50,
		tagline: "Find the iconic Scotty statue",
		description: "Locate the famous Scotty statue on campus",
		maps_link: null,
		more_info_link: null,
		unlock_timestamp: "2024-01-01T00:00:00Z",
		status: "available",
		completed_at: null,
	},
	{
		name: "Visit the Library",
		category: "The Essentials",
		location: "Hunt Library",
		secret: "LIBRARY456",
		scotty_coins: 75,
		tagline: "Explore the main library",
		description: "Visit the Hunt Library and find the secret spot",
		maps_link: null,
		more_info_link: null,
		unlock_timestamp: "2024-01-01T00:00:00Z",
		status: "available",
		completed_at: null,
	},
	// Campus of Bridges - 2 challenges
	{
		name: "Cross the Bridge",
		category: "Campus of Bridges",
		location: "Bridge to Wean Hall",
		secret: "BRIDGE789",
		scotty_coins: 60,
		tagline: "Cross the iconic bridge",
		description: "Find and cross the bridge to Wean Hall",
		maps_link: null,
		more_info_link: null,
		unlock_timestamp: "2024-01-01T00:00:00Z",
		status: "available",
		completed_at: null,
	},
	{
		name: "Bridge Photography",
		category: "Campus of Bridges",
		location: "Bridge to Gates",
		secret: "PHOTO321",
		scotty_coins: 80,
		tagline: "Take a photo on the bridge",
		description: "Take a photo on the bridge to Gates building",
		maps_link: null,
		more_info_link: null,
		unlock_timestamp: "2024-01-01T00:00:00Z",
		status: "available",
		completed_at: null,
	},
	// Corners of Carnegie - 2 challenges
	{
		name: "Carnegie Mellon Corner",
		category: "Corners of Carnegie",
		location: "Carnegie Mellon Corner",
		secret: "CARNEGIE654",
		scotty_coins: 100,
		tagline: "Find the Carnegie corner",
		description: "Locate the corner dedicated to Carnegie Mellon",
		maps_link: null,
		more_info_link: null,
		unlock_timestamp: "2024-01-01T00:00:00Z",
		status: "available",
		completed_at: null,
	},
	{
		name: "Carnegie Hall Entrance",
		category: "Corners of Carnegie",
		location: "Carnegie Hall",
		secret: "HALL987",
		scotty_coins: 90,
		tagline: "Enter Carnegie Hall",
		description: "Find the main entrance to Carnegie Hall",
		maps_link: null,
		more_info_link: null,
		unlock_timestamp: "2024-01-01T00:00:00Z",
		status: "available",
		completed_at: null,
	},
	// Let's Eat - 2 challenges
	{
		name: "Find the Food Truck",
		category: "Let's Eat",
		location: "Food Truck Area",
		secret: "FOOD147",
		scotty_coins: 40,
		tagline: "Locate the food truck",
		description: "Find the popular food truck on campus",
		maps_link: null,
		more_info_link: null,
		unlock_timestamp: "2024-01-01T00:00:00Z",
		status: "available",
		completed_at: null,
	},
	{
		name: "Café Visit",
		category: "Let's Eat",
		location: "Student Center Café",
		secret: "CAFE258",
		scotty_coins: 55,
		tagline: "Visit the student café",
		description: "Visit the café in the student center",
		maps_link: null,
		more_info_link: null,
		unlock_timestamp: "2024-01-01T00:00:00Z",
		status: "available",
		completed_at: null,
	},
	// Minor-Major Generals - 2 challenges
	{
		name: "General's Statue",
		category: "Minor-Major Generals",
		location: "General's Plaza",
		secret: "GENERAL369",
		scotty_coins: 70,
		tagline: "Find the general's statue",
		description: "Locate the statue of the famous general",
		maps_link: null,
		more_info_link: null,
		unlock_timestamp: "2024-01-01T00:00:00Z",
		status: "available",
		completed_at: null,
	},
	{
		name: "General's Corner",
		category: "Minor-Major Generals",
		location: "General's Corner",
		secret: "CORNER741",
		scotty_coins: 85,
		tagline: "Visit the general's corner",
		description: "Find the corner dedicated to the general",
		maps_link: null,
		more_info_link: null,
		unlock_timestamp: "2024-01-01T00:00:00Z",
		status: "available",
		completed_at: null,
	},
	// Off-Campus - 2 challenges
	{
		name: "Local Coffee Shop",
		category: "Off-Campus",
		location: "Oakland Coffee Shop",
		secret: "COFFEE852",
		scotty_coins: 65,
		tagline: "Visit the local coffee shop",
		description: "Find and visit the popular local coffee shop",
		maps_link: null,
		more_info_link: null,
		unlock_timestamp: "2024-01-01T00:00:00Z",
		status: "available",
		completed_at: null,
	},
	{
		name: "Museum Visit",
		category: "Off-Campus",
		location: "Carnegie Museum",
		secret: "MUSEUM963",
		scotty_coins: 95,
		tagline: "Visit the Carnegie Museum",
		description: "Visit the famous Carnegie Museum of Natural History",
		maps_link: null,
		more_info_link: null,
		unlock_timestamp: "2024-01-01T00:00:00Z",
		status: "available",
		completed_at: null,
	},
];

function CornersPage() {
	const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);

	// Get the current challenge based on index
	const currentChallenge = TEMP_CHALLENGES[currentChallengeIndex];

	// Debug: Log the current challenge
	console.log("Current challenge:", currentChallenge);
	console.log("Current challenge index:", currentChallengeIndex);

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
		if (TEMP_CHALLENGES.length > 0) {
			setCurrentChallengeIndex(
				(prevIndex) => (prevIndex + 1) % TEMP_CHALLENGES.length,
			);
		}
	};

	return (
		<div
			className={`min-h-screen ${colorClasses.bgLight} flex flex-col items-center justify-center z-[100] relative`}
		>
			{/* Debug display - hidden when printing */}
			<div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg z-50 print:hidden">
				<div>Current Index: {currentChallengeIndex}</div>
				<div>Challenge Name: {currentChallenge?.name || "None"}</div>
				<div>Challenge Category: {currentChallenge?.category || "None"}</div>
				<div>Challenge Location: {currentChallenge?.location || "None"}</div>
			</div>

			<ChallengePrint
				challenge={currentChallenge || null}
				colorClasses={colorClasses}
				onHeaderClick={handleHeaderClick}
			/>
		</div>
	);
}
