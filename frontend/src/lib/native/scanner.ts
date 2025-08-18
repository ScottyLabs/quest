import jsQR from "jsqr";
import { useCallback, useRef, useState } from "react";

type UseQRScannerResult<T> = {
	isScanning: boolean;
	lastScannedData: string | null;
	scanQR: (
		videoElement: HTMLVideoElement,
		overlayCanvas: HTMLCanvasElement,
		fn: (data: string) => Promise<T>,
		samplePeriod?: number,
	) => Promise<T | null>;
};

export function useQRScanner<T = unknown>(): UseQRScannerResult<T> {
	const [isScanning, setIsScanning] = useState(false);
	const [lastScannedData, setLastScannedData] = useState<string | null>(null);

	const streamRef = useRef<MediaStream | null>(null);
	const animationFrameRef = useRef<number | null>(null);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const cleanup = useCallback(() => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}
		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = null;
		}
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		setIsScanning(false);
	}, []);

	const scanQR = useCallback(
		(
			videoElement: HTMLVideoElement,
			overlayCanvas: HTMLCanvasElement,
			fn: (data: string) => Promise<T>,
			samplePeriod: number = 5000,
		): Promise<T | null> => {
			return new Promise((resolve) => {
				setIsScanning(true);
				let resolved = false;

				// Canvas to capture frames for QR scanning
				const detectionCanvas = document.createElement("canvas");
				const detectionCtx = detectionCanvas.getContext("2d");
				const overlayCtx = overlayCanvas.getContext("2d");

				if (!detectionCtx || !overlayCtx) {
					cleanup();
					resolve(null);
					return;
				}

				const finishScanning = async (data?: string) => {
					if (resolved) return;
					resolved = true;
					cleanup();

					if (data) {
						setLastScannedData(data);
						try {
							const result = await fn(data);
							resolve(result);
						} catch (error) {
							console.error("Error in QR scan callback:", error);
							resolve(null);
						}
					} else {
						resolve(null);
					}
				};

				// Function to grab current frame and scan for QR code
				const checkFrame = () => {
					if (resolved) return;

					// Wait until enough video data is loaded
					if (videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
						animationFrameRef.current = requestAnimationFrame(checkFrame);
						return;
					}

					detectionCanvas.width = videoElement.videoWidth;
					detectionCanvas.height = videoElement.videoHeight;
					overlayCanvas.width = videoElement.offsetWidth;
					overlayCanvas.height = videoElement.offsetHeight;

					detectionCtx.drawImage(
						videoElement,
						0,
						0,
						detectionCanvas.width,
						detectionCanvas.height,
					);
					overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

					// Extract image data from canvas
					const imageData = detectionCtx.getImageData(
						0,
						0,
						detectionCanvas.width,
						detectionCanvas.height,
					);
					const code = jsQR(
						imageData.data,
						detectionCanvas.width,
						detectionCanvas.height,
					);

					if (code?.data) {
						if (code.location) {
							const scaleX = overlayCanvas.width / detectionCanvas.width;
							const scaleY = overlayCanvas.height / detectionCanvas.height;

							overlayCtx.strokeStyle = "#00ff00";
							overlayCtx.lineWidth = 3;
							overlayCtx.beginPath();

							const corners = [
								code.location.topLeftCorner,
								code.location.topRightCorner,
								code.location.bottomRightCorner,
								code.location.bottomLeftCorner,
							];
							console.log("QR Code corners:", corners);

							corners.forEach((corner, index) => {
								const x = corner.x * scaleX;
								const y = corner.y * scaleY;

								if (index === 0) {
									overlayCtx.moveTo(x, y);
								} else {
									overlayCtx.lineTo(x, y);
								}
							});

							overlayCtx.closePath();
							overlayCtx.stroke();
						}

						finishScanning(code.data);
					} else {
						animationFrameRef.current = requestAnimationFrame(checkFrame);
					}
				};

				// Stop scanning after samplePeriod and resolve null if no code found
				timeoutRef.current = setTimeout(() => {
					finishScanning();
				}, samplePeriod);

				// Request camera access and start video stream
				navigator.mediaDevices
					.getUserMedia({ video: { facingMode: "environment" } })
					.then((mediaStream) => {
						if (resolved) {
							mediaStream.getTracks().forEach((track) => track.stop());
							return;
						}

						streamRef.current = mediaStream;
						videoElement.srcObject = mediaStream;
						videoElement.play();
						animationFrameRef.current = requestAnimationFrame(checkFrame);
					})
					.catch((error) => {
						console.error("Camera access error:", error);
						finishScanning();
					});
			});
		},
		[cleanup],
	);

	return { isScanning, lastScannedData, scanQR };
}
