import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Challenge } from "@/components/challenges";
import { useQRScanner } from "@/lib/native/scanner";
import { useCompletionFlow } from "../../hooks/use-completion-flow";
import { Commemoration } from "../../steps/commemoration";
import { QRScanner } from "../../steps/qr-scanner";

interface AvailableProps {
	challenge: Challenge;
}

export function Available({ challenge }: AvailableProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const { scanQR } = useQRScanner<string>();

	const {
		currentStep,
		error,
		capturedImage,
		setCapturedImage,
		note,
		setNote,
		isSuccess,
		handleStartCompletion,
		handleQRScanned,
		handleQRScanFailed,
		handleQRScanCancelled,
		handleSubmitCompletion,
		setError,
	} = useCompletionFlow({ challenge });

	// Handle QR scanning when step changes to 'qr'
	useEffect(() => {
		let isActive = true;

		if (currentStep === "qr") {
			const performQRScan = async () => {
				try {
					if (!videoRef.current || !canvasRef.current) {
						if (isActive) {
							setError("Camera not ready. Please try again.");
							handleQRScanCancelled();
						}
						return;
					}

					const qrResult = await scanQR(
						videoRef.current,
						canvasRef.current,
						async (qrData: string) => {
							return qrData;
						},
						15000, // 15 second timeout
					);

					if (!isActive) return; // Component unmounted or step changed

					if (!qrResult || typeof qrResult !== "string") {
						handleQRScanFailed();
					} else {
						handleQRScanned(qrResult);
					}
				} catch (error) {
					if (isActive) {
						console.error("Error scanning QR:", error);
						handleQRScanFailed();
					}
				}
			};

			performQRScan();
		}

		return () => {
			isActive = false;
		};
	}, [
		currentStep,
		scanQR,
		handleQRScanned,
		handleQRScanFailed,
		handleQRScanCancelled,
		setError,
	]);

	// Determine button text and action based on current step
	const getButtonConfig = () => {
		switch (currentStep) {
			case "idle":
				return {
					text: "Start completion",
					action: handleStartCompletion,
					isLoading: false,
				};
			case "location":
				return {
					text: "Getting location...",
					action: () => {},
					isLoading: true,
				};
			case "qr":
				return {
					text: "Scanning QR code...",
					action: () => {},
					isLoading: true,
				};
			case "commemorate":
				return {
					text: "Complete challenge",
					action: handleSubmitCompletion,
					isLoading: false,
				};
			case "submitting":
				return {
					text: "Submitting...",
					action: () => {},
					isLoading: true,
				};
			default:
				return {
					text: "Start completion",
					action: handleStartCompletion,
					isLoading: false,
				};
		}
	};

	const {
		text: buttonText,
		action: handleButtonClick,
		isLoading,
	} = getButtonConfig();

	// Show success message if completion was successful
	if (isSuccess) {
		return (
			<button
				type="button"
				disabled
				className="w-full py-2 text-lg font-bold rounded-2xl mb-4 bg-gray-200 text-gray-500 cursor-not-allowed flex items-center justify-center gap-2"
			>
				<Check className="w-5 h-5" />
				Challenge completed
			</button>
		);
	}

	return (
		<>
			<p className="mb-2 text-gray-700 text-sm">
				You're ready to complete this challenge! We'll verify your location and
				have you scan the QR code.
			</p>
			<p className="mb-4 text-gray-500 text-xs">
				You'll be able to take a photo and write a note to remember this moment.
			</p>

			{error && (
				<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
					{error}
				</div>
			)}

			{/* QR Scanner step */}
			{currentStep === "qr" && (
				<QRScanner
					videoRef={videoRef}
					canvasRef={canvasRef}
					onCancel={handleQRScanCancelled}
				/>
			)}

			{/* Commemoration step */}
			{currentStep === "commemorate" && (
				<Commemoration
					capturedImage={capturedImage}
					setCapturedImage={setCapturedImage}
					note={note}
					setNote={setNote}
				/>
			)}

			<button
				type="button"
				disabled={isLoading}
				onClick={handleButtonClick}
				className="w-full py-2 text-lg font-bold rounded-2xl mb-4 card-confirm border-2 border-default-selected bg-default text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{isLoading ? (
					<div className="flex items-center justify-center gap-2">
						<Loader2 className="w-5 h-5 animate-spin" />
						<span>{buttonText}</span>
					</div>
				) : (
					buttonText
				)}
			</button>

			{/* Hidden video and canvas refs for QR scanning */}
			<video ref={videoRef} className="hidden" muted>
				<track kind="captions" />
			</video>
			<canvas ref={canvasRef} className="hidden" />
		</>
	);
}
