interface ErrorPopupProps {
	error: string;
	onClose: () => void;
}

export function ErrorPopup({ error, onClose }: ErrorPopupProps) {
	return (
		<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
			<div className="bg-white rounded-2xl max-w-md w-full mx-4 shadow-2xl">
				{/* Header */}
				<div className="flex justify-between items-center p-6 border-b">
					<h3 className="text-lg font-semibold text-red-800">Error</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
					>
						×
					</button>
				</div>

				{/* Content */}
				<div className="p-6">
					<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
						<h4 className="text-lg font-semibold text-red-800 mb-2">
							Challenge Completion Failed
						</h4>
						<p className="text-red-600 mb-3">{error}</p>
					</div>
				</div>

				{/* Footer */}
				<div className="flex justify-end gap-2 p-6 border-t">
					<button
						type="button"
						onClick={onClose}
						className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
					>
						OK
					</button>
				</div>
			</div>
		</div>
	);
}
