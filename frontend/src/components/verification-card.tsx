import { BadgeCheck, Check, MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useApi } from "@/lib/api-context";
import type { components } from "@/lib/schema.gen";
import { callWithGeolocation } from "@/lib/utils";

// Use the same Challenge type as the challenge layout
type Challenge = components["schemas"]["AdminChallengeResponse"];

type VerificationChallenge = Challenge & {
	completed?: boolean;
	location?: string;
};

// Circular icons for each state using Lucide icons
const CompletedIcon = () => (
	<div className="w-10 h-10 rounded-full bg-[#4CAF50] flex items-center justify-center border-4 border-white shadow-[0_3px_0_#bbb]">
		<BadgeCheck size={20} color="white" strokeWidth={3} />
	</div>
);

const UnlockedIcon = () => (
	<div className="w-10 h-10 rounded-full bg-[#E74C3C] flex items-center justify-center border-4 border-white shadow-[0_3px_0_#bbb]">
		<MapPin size={16} color="white" strokeWidth={2} />
	</div>
);

// Wrapper component that adds icon and line
export function VerificationCardWithIcon({
	challenge,
}: {
	challenge: VerificationChallenge;
}) {
	const { completed } = challenge;

	const Icon = completed ? CompletedIcon : UnlockedIcon;

	return (
		<div className="flex flex-row items-center w-full">
			{/* Icon */}
			<div className="flex flex-col justify-center items-center mr-4 h-full z-10 challenge-icon">
				<Icon />
			</div>
			{/* Card content */}
			<div className="flex-1">
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
	const { name, description, location, completed, category } = challenge;

	const { $api } = useApi();
	const [isPreliminaryDialogOpen, setIsPreliminaryDialogOpen] = useState(false);
	const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [locationData, setLocationData] = useState<{
		latitude: number;
		longitude: number;
		accuracy: number;
	} | null>(null);

	// Use the API context to send location data to backend
	const completeMutation = $api.useMutation("post", "/api/complete", {
		onSuccess: () => {
			// Mark as completed locally
			challenge.status = "completed";
			setIsLocationDialogOpen(false);
		},
		onError: () => {
			alert("Failed to verify location. Please try again.");
		},
	});

	// Completed state
	if (completed) {
		return (
			<Card className="bg-green-100 rounded-2xl w-full max-w-lg shadow-md">
				<CardContent className="flex items-center min-h-0">
					<div className="w-12 h-12 mr-4 flex items-center justify-center -rotate-6">
						<BadgeCheck size={48} color="#fff" fill="#4CAF50" />
					</div>
					<div className="flex-1 font-bold text-[#4CAF50] text-base line-through">
						{name}
					</div>
				</CardContent>
			</Card>
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
				challenge.completed = true;
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
			<Card className="bg-white rounded-2xl w-full max-w-lg shadow-md">
				<CardContent className="flex items-center min-h-0">
					<div className="w-12 h-12 rounded-lg bg-[#E74C3C] mr-4 -rotate-6" />
					<div className="flex-1">
						<div className="font-bold text-black text-base">{name}</div>
						<div className="text-gray-500 text-xs">{location}</div>
						<div className="text-gray-500 text-xs">{category}</div>
					</div>
					<div className="flex items-center gap-1 ml-1">
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
				</CardContent>
			</Card>

			{/* Preliminary Confirmation Dialog */}
			<Dialog
				open={isPreliminaryDialogOpen}
				onOpenChange={setIsPreliminaryDialogOpen}
			>
				<DialogContent>
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
				<DialogContent>
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
		<div className="relative flex flex-col items-start w-full gap-3">
			{challenges.map((challenge) => (
				<VerificationCardWithIcon key={challenge.name} challenge={challenge} />
			))}
		</div>
	);
}
