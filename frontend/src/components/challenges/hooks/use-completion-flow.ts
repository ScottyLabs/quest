import { useCallback, useState } from "react";
import type { Challenge } from "@/components/challenges";
import { useApi } from "@/lib/app-context";
import { useGeolocation } from "@/lib/native/geolocation";

export type CompletionStep =
	| "idle"
	| "location"
	| "qr"
	| "commemorate"
	| "submitting";

interface UseCompletionFlowProps {
	challenge: Challenge;
}

export function useCompletionFlow({ challenge }: UseCompletionFlowProps) {
	const { $api } = useApi();
	const [currentStep, setCurrentStep] = useState<CompletionStep>("idle");
	const [error, setError] = useState<string | null>(null);
	const [qrCode, setQrCode] = useState<string>("");
	const [userLocation, setUserLocation] =
		useState<GeolocationCoordinates | null>(null);
	const [capturedImage, setCapturedImage] = useState<string>("");
	const [note, setNote] = useState<string>("");
	const [isCompleted, setIsCompleted] = useState<boolean>(false);

	const { queryPosition } = useGeolocation<GeolocationCoordinates>();

	const { mutate: completeChallenge, isPending: isSubmitting } =
		$api.useMutation("post", "/api/complete");

	const handleStartCompletion = async () => {
		try {
			setError(null);
			setCurrentStep("location");

			// Get user's current location
			const locationResult = await queryPosition(3000, async (position) => {
				return position.coords;
			});
			if (!locationResult) {
				setError(
					"Unable to get your location. Please enable location permissions and try again.",
				);
				setCurrentStep("idle");
				return;
			}

			// Store user location for later submission
			setUserLocation(locationResult);
			setCurrentStep("qr");
		} catch (error) {
			console.error("Error getting location:", error);
			setError("An unexpected error occurred. Please try again.");
			setCurrentStep("idle");
		}
	};

	const handleQRScanned = useCallback((qrData: string) => {
		setQrCode(qrData);
		setCurrentStep("commemorate");
	}, []);

	const handleQRScanFailed = useCallback(() => {
		setError("No QR code detected. Please try scanning again.");
		setCurrentStep("idle");
	}, []);

	const handleQRScanCancelled = useCallback(() => {
		setCurrentStep("idle");
	}, []);

	const handleSubmitCompletion = async () => {
		try {
			setCurrentStep("submitting");

			// Ensure we have user location data
			if (!userLocation) {
				setError(
					"Location data is missing. Please try completing the challenge again.",
				);
				setCurrentStep("commemorate");
				return;
			}

			// Strip the data URL prefix from the image data (if present)
			const imageData = capturedImage.includes("data:image")
				? capturedImage.split(",")[1] || capturedImage // Get only the base64 part, fallback to original
				: capturedImage;

			// Submit completion request
			completeChallenge(
				{
					body: {
						challenge_name: challenge.name,
						verification_code: qrCode,
						image_data: imageData,
						note: note.trim() || null,
						user_latitude: userLocation.latitude,
						user_longitude: userLocation.longitude,
						user_location_accuracy: userLocation.accuracy,
					},
				},
				{
					onSuccess: (response) => {
						if (response.success) {
							setIsCompleted(true);
							setCurrentStep("idle");
							resetForm();
						} else {
							setError(response.message || "Failed to complete challenge");
							setCurrentStep("commemorate");
						}
					},
					onError: (e: { message?: string } | undefined) => {
						setError(e?.message || "Network error. Please try again.");
						setCurrentStep("commemorate");
					},
				},
			);
		} catch (error) {
			console.error("Error submitting completion:", error);
			setError("An unexpected error occurred. Please try again.");
			setCurrentStep("commemorate");
		}
	};

	const resetForm = () => {
		setQrCode("");
		setUserLocation(null);
		setCapturedImage("");
		setNote("");
		setError(null);
		setIsCompleted(false);
	};

	const handleCancel = () => {
		setCurrentStep("idle");
		resetForm();
	};

	return {
		// State
		currentStep,
		error,
		qrCode,
		userLocation,
		capturedImage,
		setCapturedImage,
		note,
		setNote,
		isSubmitting,
		isSuccess: isCompleted,

		// Actions
		handleStartCompletion,
		handleQRScanned,
		handleQRScanFailed,
		handleQRScanCancelled,
		handleSubmitCompletion,
		handleCancel,
		resetForm,
		setError,
	};
}
