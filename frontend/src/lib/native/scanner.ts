import jsQR from "jsqr";

// Attempts to find string data from a QR code in the video stream,
// within the specified time period
export const callWithQR = async <T>(
	fn: (data: string) => Promise<T>,
	samplePeriod: number = 5000,
	videoElement: HTMLVideoElement,
	overlayCanvas: HTMLCanvasElement,
): Promise<T | null> => {
	return new Promise((resolve) => {
		let stream: MediaStream | null = null;
		let resolved = false;
		let animationFrame: number | null = null;

		const cleanup = () => {
			if (stream) {
				stream.getTracks().forEach((track) => track.stop());
			}
			if (animationFrame) {
				cancelAnimationFrame(animationFrame);
			}
		};

		// Canvas to capture frames for QR scanning
		const detectionCanvas = document.createElement("canvas");
		const detectionCtx = detectionCanvas.getContext("2d");
		const overlayCtx = overlayCanvas.getContext("2d");

		if (!detectionCtx || !overlayCtx) {
			resolve(null);
			return;
		}

		// Function to grab current frame and scan for QR code
		const checkFrame = () => {
			if (resolved) return;

			// Wait until enough video data is loaded
			if (videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
				animationFrame = requestAnimationFrame(checkFrame);
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

			if (code?.data && code.location) {
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

				resolved = true;
				cleanup();

				// Call user callback with QR code string data
				fn(code.data)
					.then(resolve)
					.catch(() => resolve(null));
			} else {
				animationFrame = requestAnimationFrame(checkFrame);
			}
		};

		// Stop scanning after samplePeriod and resolve null if no code found
		setTimeout(() => {
			if (!resolved) {
				cleanup();
				resolve(null);
			}
		}, samplePeriod);

		// Request camera access and start video stream
		navigator.mediaDevices
			.getUserMedia({ video: { facingMode: "environment" } })
			.then((mediaStream) => {
				stream = mediaStream;
				videoElement.srcObject = stream;
				videoElement.play();
				animationFrame = requestAnimationFrame(checkFrame);
			})
			.catch(() => {
				// Permission denied, no camera, etc., so stop and resolve null
				cleanup();
				resolve(null);
			});
	});
};
