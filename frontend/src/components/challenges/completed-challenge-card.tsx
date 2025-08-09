import { Camera, Check, Edit, ExternalLink, X } from "lucide-react";
import type { components } from "@/lib/schema.gen";

interface CompletedChallengeCardProps {
	challenge: components["schemas"]["AdminChallengeResponse"];
	uploadedImage: string | null;
	imageJustUploaded: boolean;
	isEditing: boolean;
	imageTransform: { scale: number; x: number; y: number };
	onPhotoUpload: () => void;
	onStartEditing: () => void;
	onSaveEditedImage: () => void;
	onStopEditing: () => void;
	onMouseDown: (e: React.MouseEvent) => void;
	onMouseMove: (e: React.MouseEvent) => void;
	onMouseUp: () => void;
	onTouchStart: (e: React.TouchEvent) => void;
	onTouchMove: (e: React.TouchEvent) => void;
	onTouchEnd: () => void;
	onWheel: (e: React.WheelEvent) => void;
	imageRef: React.RefObject<HTMLImageElement>;
	editorRef: React.RefObject<HTMLDivElement>;
}

export function CompletedChallengeCard({
	challenge,
	uploadedImage,
	imageJustUploaded,
	isEditing,
	imageTransform,
	onPhotoUpload,
	onStartEditing,
	onSaveEditedImage,
	onStopEditing,
	onMouseDown,
	onMouseMove,
	onMouseUp,
	onTouchStart,
	onTouchMove,
	onTouchEnd,
	onWheel,
	imageRef,
	editorRef,
}: CompletedChallengeCardProps) {
	return (
		<div className="flex flex-col justify-start items-center gap-4 px-6">
			{/* Image placeholder or uploaded image */}
			<div className="w-full flex flex-col justify-center items-center relative">
				{uploadedImage ? (
					<div className="relative" ref={editorRef}>
						{isEditing && (
							<div className="absolute -top-8 left-0 right-0 text-center text-sm text-gray-600 bg-yellow-50 px-2 py-1 rounded">
								Drag to move • Scroll to zoom • Click ✓ to save
							</div>
						)}
						<div
							className={`w-52 h-52 rounded-3xl overflow-hidden ${isEditing ? "cursor-move ring-2 ring-blue-400 select-none touch-none" : ""}`}
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
						</div>
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
						{isEditing && (
							<div className="absolute top-2 right-2 flex gap-2">
								<button
									type="button"
									onClick={onSaveEditedImage}
									className="w-8 h-8 bg-green-500 rounded-full shadow-lg flex items-center justify-center hover:bg-green-600 transition-colors"
									title="Save changes"
								>
									<Check className="w-4 h-4 text-white" />
								</button>
								<button
									type="button"
									onClick={onStopEditing}
									className="w-8 h-8 bg-red-500 rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 transition-colors"
									title="Cancel editing"
								>
									<X className="w-4 h-4 text-white" />
								</button>
							</div>
						)}
					</div>
				) : (
					<div className="w-52 h-52 bg-gray-100 rounded-3xl flex items-center justify-center relative">
						<Check className="w-16 h-16 text-green-500" />
					</div>
				)}
			</div>

			{/* Details */}
			<div className="flex flex-col justify-center items-center gap-7 w-full">
				<div className="flex flex-col justify-start items-start gap-6">
					<div className="flex flex-col justify-start items-start gap-4">
						<div className="flex flex-col justify-start items-center gap-4">
							{/* Description */}
							<div className="flex flex-col justify-start items-start gap-[3px]">
								<div className="inline-flex justify-center items-center gap-2.5">
									<div className="justify-start text-gray-800 text-base font-semibold font-['Open_Sans'] tracking-tight">
										Description:
									</div>
								</div>
								<div className="inline-flex justify-center items-center gap-2.5">
									<div className="justify-start text-gray-600 text-xs font-semibold font-['Open_Sans'] tracking-tight">
										{challenge.description}
									</div>
								</div>
							</div>
						</div>

						{/* Location */}
						<div className="flex flex-col justify-start items-start gap-1">
							<div className="inline-flex justify-start items-center gap-2">
								<div className="justify-start">
									<span className="text-gray-800 text-base font-semibold font-['Open_Sans'] tracking-tight">
										Location:{" "}
									</span>
								</div>
								<div className="flex justify-start items-center gap-[3px]">
									<div className="justify-start text-red-700 text-base font-semibold font-['Open_Sans'] underline tracking-tight">
										{challenge.location}
									</div>
									<div className="w-4 h-4 relative overflow-hidden">
										<ExternalLink className="w-4 h-4 text-rose-700" />
									</div>
								</div>
							</div>

							{/* More Info */}
							{challenge.more_info_link && (
								<div className="inline-flex justify-start items-center gap-2">
									<div className="justify-start">
										<span className="text-gray-800 text-base font-semibold font-['Open_Sans'] tracking-tight">
											More Info:{" "}
										</span>
									</div>
									<div className="flex justify-start items-center gap-[3px]">
										<a
											href={challenge.more_info_link}
											target="_blank"
											rel="noopener noreferrer"
											className="justify-start text-red-700 text-base font-semibold font-['Open_Sans'] underline tracking-tight"
										>
											Learn More
										</a>
										<div className="w-4 h-4 relative overflow-hidden">
											<ExternalLink className="w-4 h-4 text-rose-700" />
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Photo Upload Button */}
				<div className="w-full h-12 inline-flex justify-center items-center">
					<div className="flex-1 h-12 flex justify-center items-center">
						{uploadedImage ? (
							imageJustUploaded ? (
								<div className="flex-1 h-12 px-8 py-3 bg-green-600 rounded-3xl flex justify-center items-center gap-2">
									<Check className="w-6 h-6 text-white" />
									<div className="text-center justify-start text-white text-base font-bold font-['Open_Sans'] leading-normal">
										Image Uploaded!
									</div>
								</div>
							) : (
								<button
									type="button"
									onClick={onPhotoUpload}
									className="flex-1 h-12 px-8 py-3 bg-red-700 rounded-3xl flex justify-center items-center gap-2"
								>
									<div className="w-7 h-7 relative overflow-hidden">
										<Camera className="w-6 h-6 text-white" />
									</div>
									<div className="text-center justify-start text-white text-base font-bold font-['Open_Sans'] leading-normal">
										Replace Image
									</div>
								</button>
							)
						) : (
							<button
								type="button"
								onClick={onPhotoUpload}
								className="flex-1 h-12 px-8 py-3 bg-red-700 rounded-3xl flex justify-center items-center gap-2"
							>
								<div className="w-7 h-7 relative overflow-hidden">
									<Camera className="w-6 h-6 text-white" />
								</div>
								<div className="text-center justify-start text-white text-base font-bold font-['Open_Sans'] leading-normal">
									Add Photo
								</div>
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
