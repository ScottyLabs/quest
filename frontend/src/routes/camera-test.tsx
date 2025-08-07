import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { callWithQR } from "@/lib/native/scanner";

export const Route = createFileRoute("/camera-test")({
	component: RouteComponent,
});

function RouteComponent() {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isScanning, setIsScanning] = useState(false);
	const [scanResult, setScanResult] = useState("");
	const [error, setError] = useState("");

	const videoRef = useRef<HTMLVideoElement | null>(null);
	const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

	const handleQRCode = useCallback(async (qrData: string) => {
		console.log("QR Code detected:", qrData);
		return qrData;
	}, []);

	const startScanning = useCallback(async () => {
		setIsScanning(true);
		setScanResult("");
		setError("");

		if (!videoRef.current || !overlayCanvasRef.current) {
			setError("Video or overlay canvas not available");
			return;
		}

		try {
			const result = await callWithQR(
				handleQRCode,
				10000, // 10 second timeout
				videoRef.current,
				overlayCanvasRef.current,
			);

			if (result) {
				setScanResult(result);
			} else {
				setError("No QR code found or camera access denied");
			}
		} catch (err) {
			setError("An error occurred while scanning");
			console.error("QR scan error:", err);
		} finally {
			setIsScanning(false);
		}
	}, [handleQRCode]);

	const openModal = () => {
		setIsModalOpen(true);
		setScanResult("");
		setError("");
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setIsScanning(false);
		setScanResult("");
		setError("");

		// Stop video stream
		if (videoRef.current?.srcObject) {
			const stream = videoRef.current.srcObject as MediaStream;
			stream.getTracks().forEach((track) => track.stop());
			videoRef.current.srcObject = null;
		}
	};

	const resetAndScanAgain = () => {
		setScanResult("");
		setError("");

		startScanning();
	};

	useEffect(() => {
		if (isModalOpen && !isScanning && !scanResult && !error) {
			startScanning();
		}
	}, [isModalOpen, isScanning, startScanning, scanResult, error]);

	return (
		<div>
			{/* Trigger Button */}
			<div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
				<h2 className="text-2xl font-bold text-center mb-6">QR Code Scanner</h2>
				<div className="text-center">
					<button
						type="button"
						onClick={openModal}
						className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
					>
						Open Camera Scanner
					</button>
				</div>
			</div>

			{/* Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden">
						{/* Header */}
						<div className="flex justify-between items-center p-4 border-b">
							<h3 className="text-lg font-semibold">QR Code Scanner</h3>
							<button
								type="button"
								onClick={closeModal}
								className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
							>
								x
							</button>
						</div>

						{/* Video Container */}
						<div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
							<video
								ref={videoRef}
								className="w-full h-full object-cover"
								autoPlay
								playsInline
								muted
							/>
							<canvas
								ref={overlayCanvasRef}
								className="absolute top-0 left-0 w-full h-full pointer-events-none"
							/>

							{/* Scanning indicator */}
							{isScanning && !scanResult && !error && (
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
										<div className="flex items-center space-x-2">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
											<span>Scanning for QR codes...</span>
										</div>
									</div>
								</div>
							)}
						</div>

						{/* Results */}
						<div className="p-4">
							{scanResult && (
								<div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
									<h4 className="text-lg font-semibold text-green-800 mb-2">
										QR Code found
									</h4>
									<p className="text-sm text-gray-600 mb-2">Content:</p>
									<p className="bg-gray-100 p-3 rounded border break-all font-mono text-sm">
										{scanResult}
									</p>
									<button
										type="button"
										onClick={resetAndScanAgain}
										className="mt-3 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors mr-2"
									>
										Scan Another
									</button>
									<button
										type="button"
										onClick={closeModal}
										className="mt-3 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
									>
										Done
									</button>
								</div>
							)}

							{error && (
								<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
									<h4 className="text-lg font-semibold text-red-800 mb-2">
										Scan Failed
									</h4>
									<p className="text-red-600 mb-3">{error}</p>
									<button
										type="button"
										onClick={resetAndScanAgain}
										className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors mr-2"
									>
										Try Again
									</button>
									<button
										type="button"
										onClick={closeModal}
										className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
									>
										Cancel
									</button>
								</div>
							)}

							{isScanning && (
								<div className="text-center text-gray-600">
									<p className="text-sm">Point your camera at a QR code</p>
									<p className="text-xs mt-1">
										Green box will appear when detected
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
