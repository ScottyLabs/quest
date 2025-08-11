import { Camera, Check, Edit, X } from "lucide-react";

interface PhotoEditCardProps {
	uploadedImage: string;
	isEditing: boolean;
	imageTransform: { scale: number; x: number; y: number };
	onStartEditing: () => void;
	onSaveEditedImage: () => void;
	onStopEditing: () => void;
	onPhotoEditReplace: () => void;
	onPhotoEditContinue: () => void;
	onMouseDown: (e: React.MouseEvent) => void;
	onMouseMove: (e: React.MouseEvent) => void;
	onMouseUp: () => void;
	onTouchStart: (e: React.TouchEvent) => void;
	onTouchMove: (e: React.TouchEvent) => void;
	onTouchEnd: () => void;
	onWheel: (e: React.WheelEvent) => void;
	imageRef: React.RefObject<HTMLImageElement>;
}

export function PhotoEditCard({
	uploadedImage,
	isEditing,
	imageTransform,
	onStartEditing,
	onSaveEditedImage,
	onStopEditing,
	onPhotoEditReplace,
	onPhotoEditContinue,
	onMouseDown,
	onMouseMove,
	onMouseUp,
	onTouchStart,
	onTouchMove,
	onTouchEnd,
	onWheel,
	imageRef,
}: PhotoEditCardProps) {
	return (
		<div className="flex flex-col justify-start items-center gap-6 px-6 flex-1">
			{/* Large Image Holder with Grid Overlay */}
			<div className="w-full flex flex-col justify-center items-center relative">
				<div
					className={`relative w-full aspect-square rounded-3xl overflow-hidden ${isEditing ? "cursor-move ring-2 ring-blue-400 select-none touch-none" : ""}`}
					{...(isEditing
						? {
								onMouseDown,
								onMouseMove,
								onMouseUp,
								onTouchStart,
								onTouchMove,
								onTouchEnd,
								onWheel,
								role: "button",
								tabIndex: 0,
							}
						: {})}
				>
					<img
						src={uploadedImage}
						alt="Challenge completion"
						className={`w-full h-full object-cover transition-transform duration-200 ${isEditing ? "cursor-move" : ""}`}
						ref={imageRef}
						style={
							isEditing
								? {
										transform: `translate(${imageTransform.x}px, ${imageTransform.y}px) scale(${imageTransform.scale})`,
										transition: "none",
									}
								: {}
						}
					/>

					{/* 3x3 Grid Overlay for Cropping */}
					{isEditing && (
						<div className="absolute inset-0 pointer-events-none">
							{/* Vertical lines */}
							<div className="absolute left-1/3 top-0 bottom-0 w-px bg-white opacity-50"></div>
							<div className="absolute right-1/3 top-0 bottom-0 w-px bg-white opacity-50"></div>

							{/* Horizontal lines */}
							<div className="absolute top-1/3 left-0 right-0 h-px bg-white opacity-50"></div>
							<div className="absolute bottom-1/3 left-0 right-0 h-px bg-white opacity-50"></div>
						</div>
					)}

					{/* Edit Button */}
					{!isEditing && (
						<button
							type="button"
							onClick={onStartEditing}
							className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
							title="Edit image"
						>
							<Edit className="w-4 h-4 text-gray-600" />
						</button>
					)}
				</div>
			</div>

			{/* Buttons */}
			<div className="w-full flex gap-4 mb-6">
				{isEditing ? (
					<>
						<button
							type="button"
							onClick={onStopEditing}
							className="flex-1 h-12 px-6 py-3 bg-red-500 rounded-3xl flex justify-center items-center gap-2 hover:bg-red-600 transition-colors"
						>
							<X className="w-6 h-6 text-white" />
							<div className="text-center justify-start text-white text-base font-bold font-['Open_Sans'] leading-normal">
								Cancel
							</div>
						</button>

						<button
							type="button"
							onClick={onSaveEditedImage}
							className="flex-1 h-12 px-6 py-3 bg-green-500 rounded-3xl flex justify-center items-center gap-2 hover:bg-green-600 transition-colors"
						>
							<Check className="w-6 h-6 text-white" />
							<div className="text-center justify-start text-white text-base font-bold font-['Open_Sans'] leading-normal">
								Save
							</div>
						</button>
					</>
				) : (
					<>
						<button
							type="button"
							onClick={onPhotoEditReplace}
							className="flex-1 h-12 px-6 py-3 bg-gray-500 rounded-3xl flex justify-center items-center gap-2 hover:bg-gray-600 transition-colors"
						>
							<div className="w-7 h-7 relative overflow-hidden">
								<Camera className="w-6 h-6 text-white" />
							</div>
							<div className="text-center justify-start text-white text-base font-bold font-['Open_Sans'] leading-normal">
								Replace
							</div>
						</button>

						<button
							type="button"
							onClick={onPhotoEditContinue}
							className="flex-1 h-12 px-6 py-3 bg-red-700 rounded-3xl flex justify-center items-center gap-2 hover:bg-red-800 transition-colors"
						>
							<div className="text-center justify-start text-white text-base font-bold font-['Open_Sans'] leading-normal">
								Continue
							</div>
						</button>
					</>
				)}
			</div>
		</div>
	);
}
