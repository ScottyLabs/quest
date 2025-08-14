import { X } from "lucide-react";
import type { RefObject } from "react";

interface QRScannerProps {
	videoRef: RefObject<HTMLVideoElement | null>;
	canvasRef: RefObject<HTMLCanvasElement | null>;
	onCancel: () => void;
}

export function QRScanner({ videoRef, canvasRef, onCancel }: QRScannerProps) {
	return (
		<div className="bg-gray-50 rounded-2xl p-4 mb-4 border-2 border-gray-200">
			<div className="text-gray-800 text-lg font-semibold mb-4 text-center">
				Position QR code in camera view
			</div>

			<div className="relative w-full max-w-sm mx-auto">
				<video
					ref={videoRef}
					className="w-full aspect-square object-cover rounded-lg"
					autoPlay
					playsInline
					muted
				/>
				<canvas
					ref={canvasRef}
					className="absolute inset-0 w-full h-full pointer-events-none"
				/>

				{/* Scanning indicator */}
				<div className="absolute inset-4 border-2 border-gray-400 rounded-lg pointer-events-none animate-pulse" />

				{/* Cancel button inside the video area */}
				<button
					type="button"
					onClick={onCancel}
					className="absolute top-2 right-2 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors shadow-sm"
				>
					<X className="w-4 h-4 text-gray-600" />
				</button>
			</div>
		</div>
	);
}
