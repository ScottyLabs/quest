interface QRScannerModalProps {
	isScanning: boolean;
	scanResult: string;
	error: string;
	onClose: () => void;
	onResetAndScanAgain: () => void;
	videoRef: React.RefObject<HTMLVideoElement>;
	overlayCanvasRef: React.RefObject<HTMLCanvasElement>;
}

export function QRScannerModal({
	isScanning,
	scanResult,
	error,
	onClose,
	onResetAndScanAgain,
	videoRef,
	overlayCanvasRef,
}: QRScannerModalProps) {
	return (
		<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
			<div className="bg-white w-full h-full flex flex-col">
				{/* Header */}
				<div className="flex justify-between items-center p-4 border-b">
					<h3 className="text-lg font-semibold">QR Code Scanner</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
					>
						×
					</button>
				</div>

				{/* Video Container */}
				<div className="relative bg-black flex-1">
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
				<div className="p-4 bg-white">
					{scanResult && (
						<div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
							<h4 className="text-lg font-semibold text-green-800 mb-2">
								QR Code found
							</h4>
							<p className="text-sm text-gray-600 mb-2">Content:</p>
							<p className="bg-gray-100 p-3 rounded border break-all font-mono text-sm">
								{scanResult}
							</p>
							<div className="mt-3 flex gap-2">
								<button
									type="button"
									onClick={onResetAndScanAgain}
									className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
								>
									Scan Another
								</button>
								<button
									type="button"
									onClick={onClose}
									className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
								>
									Done
								</button>
							</div>
						</div>
					)}

					{isScanning && !scanResult && !error && (
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
	);
}
