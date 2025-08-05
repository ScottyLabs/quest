import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChallengeCircle } from "@/components/challenge-circle";
import type { ChallengeData } from "@/lib/challenge-api";

export const Route = createFileRoute("/corners")({
	component: CornersPage,
});

// Temporary data with 2 challenges for each category
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
	const [challenges, setChallenges] = useState<ChallengeData[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);

	useEffect(() => {
		// Simulate loading delay
		const timer = setTimeout(() => {
			setChallenges(TEMP_CHALLENGES);
			setLoading(false);
		}, 500);

		return () => clearTimeout(timer);
	}, []);

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
			className={`min-h-screen ${colorClasses.bgLight} flex flex-col items-center justify-center`}
		>
			<div
				className={`rounded-[50px] ${colorClasses.bg} flex flex-col items-center justify-center shadow-[0px_51px_0px_0px_rgba(0,0,0,1.00)] border-[13px] border-black`}
			>
				{/* Header */}
				<button
					type="button"
					className={`w-full max-w-sm ${colorClasses.bg} rounded-t-[34px] px-4 py-0 mb-1 cursor-pointer hover:opacity-90 transition-opacity`}
					onClick={handleHeaderClick}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							handleHeaderClick();
						}
					}}
					aria-label={`Switch to next challenge. Current: ${currentChallenge?.name || "Unknown"}`}
				>
					<div className="flex items-center gap-3 justify-center w-full">
						{/* Challenge Circle - 27% width */}
						<div className="w-[27%] flex justify-center">
							{currentChallenge ? (
								<ChallengeCircle
									category={{
										name: currentChallenge.category,
										color: colorClasses.iconColor,
										completed: 0,
										total: 1,
										flagColor: colorClasses.iconColor,
									}}
									size="lg"
									showIcon={true}
									iconColor={colorClasses.iconColor}
								/>
							) : (
								<div
									className={`w-24 h-24 rounded-full flex items-center justify-center`}
								>
									<div className="w-16 h-16 bg-white rounded-full"></div>
								</div>
							)}
						</div>
						{/* Text - remaining width */}
						<div className="flex-1 text-white text-4xl font-extrabold tracking-wide text-center">
							{currentChallenge?.category || "Unknown"}
						</div>
					</div>
				</button>

				{/* Main Content */}
				<div
					className={`w-full max-w-sm ${colorClasses.bgLight} rounded-b-[34px] p-4`}
				>
					<div className="bg-white rounded-[20px] p-6 shadow-lg">
						{/* Challenge Name and Location */}
						<div className="bg-white rounded-[10px] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] p-4 mb-4">
							<div className="text-center text-secondary-foreground text-2xl font-extrabold tracking-wide ">
								{currentChallenge?.name || "Unknown Challenge"}
							</div>
							<div className="text-center text-gray-600 text-lg font-medium">
								{currentChallenge?.location || "Unknown"}
							</div>
						</div>

						{/* Challenge Details */}
						<div className="space-y-4 mb-4">
							{/* QR Code Placeholder */}
							<div className="bg-gray-50 rounded-lg p-3 w-full aspect-square"></div>

							{/* Secret Code */}
							<div className="bg-gray-50 rounded-lg p-3">
								<div className="text-sm font-semibold text-gray-600 mb-1">
									Secret Code
								</div>
								<div className="text-lg font-mono font-medium bg-gray-100 px-2 py-1 rounded">
									{currentChallenge?.secret || "****"}
								</div>
							</div>
						</div>

						{/* CMU Property Notice */}
						<div className="text-center text-secondary-foreground text-l font-extrabold tracking-wide">
							CMU Property Do Not Remove
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
