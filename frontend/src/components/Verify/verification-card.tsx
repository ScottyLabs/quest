import { BadgeCheck, Check, MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	type CategoryLabel,
	categoryIconFromId,
	categoryIdFromLabel,
	colorClasses,
} from "@/lib/data/categories";
import { callWithGeolocation } from "@/lib/native/geolocation";
import type { components } from "@/lib/schema.gen";

// Use the same Challenge type as the challenge layout
type Challenge = components["schemas"]["AdminChallengeResponse"];

type VerificationChallenge = Challenge;

// Wrapper component that adds icon and line
export function VerificationCardWithIcon({
	challenge,
	isLast = false,
}: {
	challenge: VerificationChallenge;
	isLast?: boolean;
}) {
	const isCompleted = challenge.status === "completed";

	// Get the category color like in challenge cards
	const thisId = categoryIdFromLabel[challenge.category as CategoryLabel];
	const primaryColor = colorClasses[thisId].primary;
	const iconColor = isCompleted ? "bg-success" : primaryColor;

	return (
		<div className="flex flex-row gap-6 w-full max-w-full">
			<div className="shrink-0 my-auto">
				<div
					className={`relative size-10 rounded-full border-4 border-white shadow-[0_3px_0_#bbb] ${iconColor}`}
				>
					{isCompleted ? (
						<BadgeCheck className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white size-1/2 stroke-4" />
					) : (
						<MapPin className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white size-1/2 stroke-3" />
					)}

					{!isLast && (
						<div className="-z-10 absolute border-l-2 border-white border-dashed h-24 top-full left-[calc(50%-1px)]" />
					)}
				</div>
			</div>
			<div className="flex-1 min-w-0">
				<VerificationCard challenge={challenge} />
			</div>
		</div>
	);
}

// Main verification card component
export function VerificationCard({
	challenge,
}: {
	challenge: VerificationChallenge;
}) {
	const { name, location, status, category } = challenge;

	// Get the category color like in challenge cards
	const thisId = categoryIdFromLabel[category as CategoryLabel];
	const primaryColor = colorClasses[thisId].primary;

	const [isPreliminaryDialogOpen, setIsPreliminaryDialogOpen] = useState(false);
	const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [locationData, setLocationData] = useState<{
		latitude: number;
		longitude: number;
		accuracy: number;
	} | null>(null);

	// Completed state
	if (status === "completed") {
		return (
			<div className="card-success rounded-2xl p-4 bg-success-light hover:bg-success-hover cursor-pointer flex flex-row gap-4 w-full min-h-[80px]">
				{/* Left column - Check icon */}
				<div className="flex-shrink-0 flex items-center justify-center">
					<div className="relative size-12">
						<BadgeCheck size={48} color="#fff" fill="#4CAF50" />
					</div>
				</div>

				{/* Middle column - Content (expands to fill remaining space) */}
				<div className="flex-1 flex flex-col justify-center min-w-0 pr-2 space-y-1">
					<h1
						className="text-xl text-success font-bold line-through leading-tight break-words overflow-hidden"
						title={name}
					>
						{name}
					</h1>
					<p
						className="text-xs text-gray-500 leading-tight break-words overflow-hidden"
						title={location}
					>
						{location}
					</p>
					<p
						className="text-xs text-gray-500 leading-tight break-words overflow-hidden"
						title={category}
					>
						{category}
					</p>
				</div>

				{/* Right column - Empty space for consistency */}
				<div className="flex-shrink-0 w-11"></div>
			</div>
		);
	}

	// Unlocked but not completed
	const handleVerifyClick = () => {
		// Show preliminary confirmation dialog first
		setIsPreliminaryDialogOpen(true);
	};

	const handlePreliminaryConfirm = async () => {
		setIsPreliminaryDialogOpen(false);
		setIsLoading(true);

		try {
			// Get user's location
			const position = await callWithGeolocation(
				(position) => Promise.resolve(position),
				2000, // 2 second sample period
			);

			if (!position) {
				alert(
					"Unable to get your location. Please enable location services and try again.",
				);
				setIsLoading(false);
				return;
			}

			const { latitude, longitude } = position.coords;
			const accuracy = position.coords.accuracy;

			setLocationData({ latitude, longitude, accuracy });
			setIsLocationDialogOpen(true);
		} catch (error) {
			console.error("Error getting location:", error);
			alert("Error getting your location. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleConfirmLocation = async () => {
		if (!locationData) return;

		setIsLoading(true);

		try {
			// Send location data to backend using direct fetch since endpoint not in schema
			const response = await fetch("/api/admin/challenges/geolocation", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
				body: JSON.stringify({
					name: challenge.name,
					latitude: locationData.latitude,
					longitude: locationData.longitude,
					location_accuracy: locationData.accuracy,
				}),
			});

			if (response.ok) {
				// Mark as completed locally
				challenge.status = "completed";
				setIsLocationDialogOpen(false);
				// You might want to trigger a refresh of the challenges list here
			} else {
				alert("Failed to verify location. Please try again.");
			}
		} catch (error) {
			console.error("Error verifying location:", error);
			alert("Error verifying location. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<>
			<div className="card-default relative rounded-2xl p-4 bg-white hover:bg-gray-100 cursor-pointer flex flex-row gap-4 w-full min-h-[80px]">
				{/* Left column - Category icon */}
				<div className="flex-shrink-0 flex items-center justify-center">
					<div className="relative -m-1 size-12">
						<div
							className={`absolute size-7/8 left-1/8 top-1/2 -translate-y-1/2 -rotate-20 rounded-lg ${primaryColor}`}
						/>
						{/* Category icon */}
						{(() => {
							const CategoryIcon = categoryIconFromId[thisId];
							return CategoryIcon ? (
								<CategoryIcon className="absolute left-[58%] top-1/2 -translate-x-1/2 -translate-y-1/2 text-white size-1/2 stroke-2" />
							) : null;
						})()}
					</div>
				</div>

				{/* Middle column - Content (expands to fill remaining space) */}
				<div className="flex-1 flex flex-col justify-center min-w-0 pr-2 space-y-1">
					<h1
						className="font-bold text-lg leading-tight break-words overflow-hidden"
						title={name}
					>
						{name}
					</h1>
					<p
						className="text-xs text-gray-500 leading-tight break-words overflow-hidden"
						title={location}
					>
						{location}
					</p>
					<p
						className="text-xs text-gray-500 leading-tight break-words overflow-hidden"
						title={category}
					>
						{category}
					</p>
				</div>

				{/* Right column - Button (centered) */}
				<div className="flex-shrink-0 flex items-center justify-center">
					<Button
						className="w-11 h-9 rounded-md bg-gray-100 flex items-center justify-center shadow-[0_4px_0_#bbb]"
						onClick={handleVerifyClick}
						disabled={isLoading}
					>
						{isLoading ? (
							<div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
						) : (
							<Check size={20} color="#4CAF50" strokeWidth={3} />
						)}
					</Button>
				</div>
			</div>

			{/* Preliminary Confirmation Dialog */}
			<Dialog
				open={isPreliminaryDialogOpen}
				onOpenChange={setIsPreliminaryDialogOpen}
			>
				<DialogContent className="bg-white">
					<DialogHeader>
						<DialogTitle>Confirm Your Location</DialogTitle>
						<DialogDescription>
							Are you at the correct location for this challenge?
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div className="bg-blue-50 p-4 rounded-lg">
							<h4 className="font-semibold mb-2">Challenge: {name}</h4>
							<div className="text-sm text-gray-600">
								<p>
									Please make sure you are at the correct location before
									proceeding.
								</p>
								<div className="mt-2 space-y-1">
									<p className="font-medium">Category: {category}</p>
									<p className="font-medium">Location: {location}</p>
								</div>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsPreliminaryDialogOpen(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button onClick={handlePreliminaryConfirm} disabled={isLoading}>
							{isLoading
								? "Getting Location..."
								: "Yes, I'm at the right place"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Location Confirmation Dialog */}
			<Dialog
				open={isLocationDialogOpen}
				onOpenChange={setIsLocationDialogOpen}
			>
				<DialogContent className="bg-white">
					<DialogHeader>
						<DialogTitle>Confirm Location Data</DialogTitle>
						<DialogDescription>
							Please confirm your location coordinates for challenge
							verification.
						</DialogDescription>
					</DialogHeader>

					{locationData && (
						<div className="space-y-4">
							<div className="bg-gray-50 p-4 rounded-lg">
								<h4 className="font-semibold mb-2">Challenge: {name}</h4>
								<div className="space-y-2 text-sm">
									<div>
										<strong>Latitude:</strong>{" "}
										{locationData.latitude.toFixed(6)}
									</div>
									<div>
										<strong>Longitude:</strong>{" "}
										{locationData.longitude.toFixed(6)}
									</div>
									<div>
										<strong>Accuracy:</strong>{" "}
										{locationData.accuracy.toFixed(1)} meters
									</div>
								</div>
							</div>
						</div>
					)}

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsLocationDialogOpen(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button onClick={handleConfirmLocation} disabled={isLoading}>
							{isLoading ? "Verifying..." : "Confirm Location"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

export function VerificationList({
	challenges,
}: {
	challenges: VerificationChallenge[];
}) {
	return (
		<div className="relative flex flex-col items-stretch w-full gap-3 max-w-full">
			{challenges.map((challenge, index) => (
				<VerificationCardWithIcon
					key={challenge.name}
					challenge={challenge}
					isLast={index === challenges.length - 1}
				/>
			))}
		</div>
	);
}
