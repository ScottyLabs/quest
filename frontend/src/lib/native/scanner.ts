import jsQR from "jsqr";

// Attempts to find string data from a QR code in the video stream,
// within the specified time period
export const callWithCameraQRScan = async <T>(
	fn: (data: string) => Promise<T>,
	samplePeriod: number = 5000,
): Promise<T | null> => {
	return new Promise((resolve) => {
		// Hidden video element for camera stream
		const video = document.createElement("video");
		video.setAttribute("autoplay", "true");
		video.setAttribute("playsinline", "true"); // required for iOS Safari
		video.style.display = "none";
		document.body.appendChild(video);

		// Canvas to capture frames for QR scanning
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			resolve(null);
			return;
		}

		let stream: MediaStream | null = null;
		let resolved = false;

		const cleanup = () => {
			if (stream) {
				stream.getTracks().forEach((track) => track.stop());
			}
			video.remove();
			canvas.remove();
		};

		// Function to grab current frame and scan for QR code
		const checkFrame = () => {
			// Wait until enough video data is loaded
			if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

			// Extract image data from canvas
			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const code = jsQR(imageData.data, canvas.width, canvas.height);

			if (code?.data) {
				resolved = true;
				clearInterval(interval);
				cleanup();

				// Call user callback with QR code string data
				fn(code.data)
					.then(resolve)
					.catch(() => resolve(null));
			}
		};

		const interval = setInterval(() => {
			if (!resolved) checkFrame();
		}, 10);

		// Stop scanning after samplePeriod and resolve null if no code found
		setTimeout(() => {
			if (!resolved) {
				clearInterval(interval);
				cleanup();
				resolve(null);
			}
		}, samplePeriod);

		// Request camera access and start video stream
		navigator.mediaDevices
			.getUserMedia({ video: { facingMode: "environment" } })
			.then((mediaStream) => {
				stream = mediaStream;
				video.srcObject = stream;
			})
			.catch(() => {
				// Permission denied, no camera, etc., so stop and resolve null
				clearInterval(interval);
				cleanup();
				resolve(null);
			});
	});
};
