import { Camera, X } from "lucide-react";
import { useRef } from "react";
import { usePicture } from "@/lib/native/picture";

interface CommemorationProps {
	capturedImage: string;
	setCapturedImage: (image: string) => void;
	note: string;
	setNote: (note: string) => void;
}

export function Commemoration({
	capturedImage,
	setCapturedImage,
	note,
	setNote,
}: CommemorationProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { takePicture, videoRef, canvasRef } = usePicture();

	const handleTakePhoto = async () => {
		const imageData = await takePicture();
		if (imageData) {
			setCapturedImage(imageData);
		}
	};

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				if (e.target?.result) {
					setCapturedImage(e.target.result as string);
				}
			};
			reader.readAsDataURL(file);
		}
	};

	return (
		<div className="bg-gray-50 rounded-2xl p-3 mb-4 border-2 border-gray-200">
			<h3 className="text-lg font-semibold mb-2">
				Commemorate your achievement!
			</h3>
			<p className="text-sm text-gray-600 mb-3">
				Take a photo and write a note to remember this moment (both optional).
			</p>

			{/* Photo section */}
			<div className="mb-3">
				<div className="text-sm font-medium text-gray-700 mb-2">Photo</div>
				{capturedImage ? (
					<div className="relative">
						<img
							src={capturedImage}
							alt="Captured"
							className="w-full h-48 object-contain rounded-2xl mb-2 bg-gray-100"
						/>
						<button
							type="button"
							onClick={() => setCapturedImage("")}
							className="absolute top-2 right-2 p-1 bg-white rounded-full hover:bg-gray-100 transition-colors shadow-sm"
						>
							<X className="w-4 h-4 text-gray-600" />
						</button>
					</div>
				) : (
					<div className="flex gap-2 mb-2">
						<button
							type="button"
							onClick={handleTakePhoto}
							className="flex-1 flex items-center justify-center gap-2 py-1.5 px-3 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
						>
							<Camera className="w-4 h-4" />
							Take photo
						</button>

						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="flex-1 py-1.5 px-3 text-sm font-medium bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300"
						>
							Upload photo
						</button>
					</div>
				)}
			</div>

			{/* Note section */}
			<div className="mb-2">
				<label
					htmlFor="challenge-note"
					className="block text-sm font-medium text-gray-700 mb-2"
				>
					Note (optional)
				</label>
				<textarea
					id="challenge-note"
					value={note}
					onChange={(e) => setNote(e.target.value)}
					placeholder="Write about your experience finding this challenge..."
					className="w-full p-3 border border-gray-300 rounded-2xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
					rows={2}
					maxLength={500}
				/>

				<div className="text-xs text-gray-500 mt-1">
					{note.length}/500 characters
				</div>
			</div>

			{/* Hidden file input for photo upload */}
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				onChange={handleFileUpload}
				className="hidden"
			/>

			{/* Hidden video and canvas for photo capture */}
			<video ref={videoRef} className="hidden" muted>
				<track kind="captions" />
			</video>
			<canvas ref={canvasRef} className="hidden" />
		</div>
	);
}
