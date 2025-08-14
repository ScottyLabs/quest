import { useRef } from "react";

export function usePicture() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const takePicture = async (): Promise<string | null> => {
		try {
			if (!videoRef.current || !canvasRef.current) return null;

			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "environment" },
			});

			videoRef.current.srcObject = stream;
			await videoRef.current.play();

			// Wait for video to be ready
			await new Promise((resolve) => {
				if (videoRef.current) {
					videoRef.current.onloadedmetadata = () => resolve(true);
				}
			});

			// Capture photo
			const canvas = canvasRef.current;
			const video = videoRef.current;

			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;

			const ctx = canvas.getContext("2d");
			if (ctx) {
				ctx.drawImage(video, 0, 0);
				const imageData = canvas.toDataURL("image/jpeg", 0.8);

				// Stop the stream
				stream.getTracks().forEach((track) => track.stop());

				return imageData;
			}

			// Stop the stream if we get here
			stream.getTracks().forEach((track) => track.stop());
			return null;
		} catch (error) {
			console.error("Error taking photo:", error);
			return null;
		}
	};

	return {
		takePicture,
		videoRef,
		canvasRef,
	};
}
