import { X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { Challenge } from "@/components/challenges/card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useApi } from "@/lib/api-context";
import { callWithQR } from "@/lib/native/scanner";
import { CompletedChallengeCard } from "./completed-challenge-card";
import { IncompleteChallengeCard } from "./incomplete-challenge-card";
import { PhotoEditCard } from "./photo-edit-card";
import { QRScannerModal } from "./qr-scanner-modal";
import { SuccessPopup } from "./success-popup";

interface ChallengeOpenCardProps {
	challenge: Challenge;
	children: React.ReactNode;
	onChallengeComplete?: (challengeName: string, coinsEarned: number) => void;
}

export function ChallengeOpenCard({
	challenge,
	children,
	onChallengeComplete,
}: ChallengeOpenCardProps) {
	const { $api } = useApi();

	const [isScanning, setIsScanning] = useState(false);
	const [scanResult, setScanResult] = useState("");

	const [showSuccessCard, setShowSuccessCard] = useState(false);
	const [showPhotoEditCard, setShowPhotoEditCard] = useState(false);

	const [isCompleted, setIsCompleted] = useState(
		challenge.status === "completed",
	);
	const [isCompleting, setIsCompleting] = useState(false);

	const [uploadedImage, setUploadedImage] = useState<string | null>(null);
	const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

	const [isEditing, setIsEditing] = useState(false);
	const [imageJustUploaded, setImageJustUploaded] = useState(false);
	const [imageTransform, setImageTransform] = useState({
		scale: 1,
		x: 0,
		y: 0,
	});

	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
	const [initialDistance, setInitialDistance] = useState(0);
	const [initialScale, setInitialScale] = useState(1);

	const videoRef = useRef<HTMLVideoElement | null>(null);
	const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const imageRef = useRef<HTMLImageElement | null>(null);
	const editorRef = useRef<HTMLDivElement | null>(null);

	const handleQRCode = useCallback(async (qrData: string) => {
		console.log("QR Code detected:", qrData);
		return qrData;
	}, []);

	const {
		mutate: completeChallenge,
		isPending,
		isSuccess,
	} = $api.useMutation("post", "/api/complete");

	const onComplete = () => {
		completeChallenge({
			body: {
				challenge_name: challenge.name,
				verification_code: challenge.secret,
				image_data: uploadedImage || "", // Base64 image data
				note: "",
			},
		});
	};

	const startScanning = useCallback(async () => {
		// If challenge is already completed, don't scan again
		if (isCompleted) {
			return;
		}

		if (!videoRef.current || !overlayCanvasRef.current) {
			console.error("Video or overlay canvas not available");
			return;
		}

		try {
			const result = await callWithQR(
				handleQRCode,
				10000, // 10 second timeout
				videoRef.current,
				overlayCanvasRef.current,
			);

			if (result) {
				setScanResult(result);
				// Check if the scanned result matches the challenge secret
				if (result === challenge.secret) {
					// Show success card instead of immediately completing
					setShowSuccessCard(true);
					setIsScanning(false);
					setScanResult("");

					// Stop video stream
					if (videoRef.current?.srcObject) {
						const stream = videoRef.current.srcObject as MediaStream;
						stream.getTracks().forEach((track) => track.stop());
						videoRef.current.srcObject = null;
					}
				} else {
					console.error("Invalid QR code. Please try again.");
					return;
				}
			} else {
				console.error("No QR code found or camera access denied");
				return;
			}
		} catch (err) {
			console.error("An error occurred while scanning:", err);
			return;
		}
	}, [handleQRCode, challenge.secret, isCompleted]);

	const resetAndScanAgain = () => {
		setScanResult("");
		setShowSuccessCard(false);
		setShowPhotoEditCard(false);
		startScanning();
	};

	const openScannerModal = () => {
		if (isCompleted) return;

		setIsScanning(true);
		setScanResult("");

		// Start scanning after a small delay to ensure modal is rendered
		setTimeout(() => {
			startScanning();
		}, 100);
	};

	const closeScannerModal = () => {
		setIsScanning(false);
		setScanResult("");
		setShowSuccessCard(false);
		setShowPhotoEditCard(false);

		// Stop video stream
		if (videoRef.current?.srcObject) {
			const stream = videoRef.current.srcObject as MediaStream;
			stream.getTracks().forEach((track) => track.stop());
			videoRef.current.srcObject = null;
		}
	};

	const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];

		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				const result = e.target?.result as string;
				setUploadedImage(result);
				setImageJustUploaded(true);
				setShowPhotoEditCard(true);

				// Reset the imageJustUploaded state after 3 seconds
				setTimeout(() => setImageJustUploaded(false), 3000);
			};
			reader.readAsDataURL(file);
		}
	};

	const openPhotoUpload = () => {
		fileInputRef.current?.click();
	};

	const startEditing = () => {
		setIsEditing(true);
		setImageTransform({ scale: 1, x: 0, y: 0 });
		setShowPhotoEditCard(true);
	};

	const stopEditing = () => {
		setIsEditing(false);
		setIsDragging(false);
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		if (!isEditing) return;
		setIsDragging(true);
		setDragStart({
			x: e.clientX - imageTransform.x,
			y: e.clientY - imageTransform.y,
		});
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!isEditing || !isDragging) return;
		const newX = e.clientX - dragStart.x;
		const newY = e.clientY - dragStart.y;
		setImageTransform((prev) => ({ ...prev, x: newX, y: newY }));
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	const handleTouchStart = (e: React.TouchEvent) => {
		if (!isEditing) return;
		e.preventDefault();

		if (e.touches.length === 1) {
			// Single touch - dragging
			setIsDragging(true);
			const touch = e.touches[0];
			if (touch) {
				setDragStart({
					x: touch.clientX - imageTransform.x,
					y: touch.clientY - imageTransform.y,
				});
			}
		} else if (e.touches.length === 2) {
			// Two touches - pinch to zoom
			const touch1 = e.touches[0];
			const touch2 = e.touches[1];
			if (touch1 && touch2) {
				const distance = Math.sqrt(
					(touch2.clientX - touch1.clientX) ** 2 +
						(touch2.clientY - touch1.clientY) ** 2,
				);
				setInitialDistance(distance);
				setInitialScale(imageTransform.scale);
			}
		}
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		if (!isEditing) return;
		e.preventDefault();

		if (e.touches.length === 1 && isDragging) {
			// Single touch - dragging
			const touch = e.touches[0];

			if (touch) {
				const newX = touch.clientX - dragStart.x;
				const newY = touch.clientY - dragStart.y;
				setImageTransform((prev) => ({ ...prev, x: newX, y: newY }));
			}
		} else if (e.touches.length === 2) {
			// Two touches - pinch to zoom
			const touch1 = e.touches[0];
			const touch2 = e.touches[1];
			if (touch1 && touch2 && initialDistance > 0) {
				const distance = Math.sqrt(
					(touch2.clientX - touch1.clientX) ** 2 +
						(touch2.clientY - touch1.clientY) ** 2,
				);

				const scale = (distance / initialDistance) * initialScale;
				const clampedScale = Math.max(0.5, Math.min(3, scale));
				setImageTransform((prev) => ({ ...prev, scale: clampedScale }));
			}
		}
	};

	const handleTouchEnd = () => {
		setIsDragging(false);
		setInitialDistance(0);
		setInitialScale(1);
	};

	const handleWheel = (e: React.WheelEvent) => {
		if (!isEditing) return;
		e.preventDefault();

		const delta = e.deltaY > 0 ? 0.9 : 1.1;
		setImageTransform((prev) => ({
			...prev,
			scale: Math.max(0.5, Math.min(3, prev.scale * delta)),
		}));
	};

	const saveEditedImage = () => {
		if (!imageRef.current || !editorRef.current) return;

		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const img = imageRef.current;

		// Use the actual image dimensions for better quality
		canvas.width = img.naturalWidth || 800;
		canvas.height = img.naturalHeight || 800;

		// Calculate the visible area
		const scale = imageTransform.scale;
		const x = imageTransform.x;
		const y = imageTransform.y;

		// Draw the transformed image
		ctx.save();
		ctx.translate(canvas.width / 2, canvas.height / 2);
		ctx.scale(scale, scale);
		ctx.translate(-x / scale, -y / scale);
		ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
		ctx.restore();

		// Convert to base64
		const editedImageData = canvas.toDataURL("image/jpeg", 0.8);
		setUploadedImage(editedImageData);
		stopEditing();
		// Keep the photo edit card open after saving
		setShowPhotoEditCard(true);
	};

	const handleContinueToCompletion = () => {
		setShowSuccessCard(false);
		setIsCompleted(true);
	};

	const handlePhotoEditContinue = () => {
		setShowPhotoEditCard(false);
		setIsEditing(false);
	};

	const handlePhotoEditReplace = () => {
		openPhotoUpload();
	};

	const closeModal = () => {
		setIsScanning(false);
		setScanResult("");
		setShowSuccessCard(false);
		setShowPhotoEditCard(false);
		setIsCompleted(challenge.status === "completed");
		setUploadedImage(null);
		setIsEditing(false);
		setImageJustUploaded(false);
		setImageTransform({ scale: 1, x: 0, y: 0 });
		setIsDragging(false);

		// Stop video stream
		if (videoRef.current?.srcObject) {
			const stream = videoRef.current.srcObject as MediaStream;
			stream.getTracks().forEach((track) => track.stop());
			videoRef.current.srcObject = null;
		}
	};

	return (
		<Dialog>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent
				className="w-[90%] sm:max-w-xl sm:w-full max-h-[965px] p-0 bg-transparent border-none shadow-none"
				showCloseButton={false}
				overlayClassName={isScanning ? "bg-black/90" : "bg-black/50"}
			>
				{/* Content */}
				<div className="w-full bg-white rounded-2xl flex flex-col gap-6 overflow-hidden pb-[36px]">
					{/* Header */}
					<div className="min-h-14 px-6 py-3 bg-white rounded-[10px] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] flex justify-between items-center mx-6 mt-4">
						<div className="flex-1 min-w-0">
							<div className="text-gray-800 text-2xl font-extrabold font-['Open_Sans'] tracking-wide break-words">
								{challenge.name}
							</div>
						</div>

						<DialogClose
							className="w-10 h-10 relative overflow-hidden flex-shrink-0 ml-4 flex items-center justify-center"
							onClick={closeModal}
						>
							<X className="w-[60%] h-[60%]" />
						</DialogClose>
					</div>

					{/* Content */}
					{showPhotoEditCard && uploadedImage ? (
						<PhotoEditCard
							uploadedImage={uploadedImage}
							isEditing={isEditing}
							imageTransform={imageTransform}
							onStartEditing={startEditing}
							onSaveEditedImage={saveEditedImage}
							onStopEditing={stopEditing}
							onPhotoEditReplace={handlePhotoEditReplace}
							onPhotoEditContinue={handlePhotoEditContinue}
							onMouseDown={handleMouseDown}
							onMouseMove={handleMouseMove}
							onMouseUp={handleMouseUp}
							onTouchStart={handleTouchStart}
							onTouchMove={handleTouchMove}
							onTouchEnd={handleTouchEnd}
							onWheel={handleWheel}
							imageRef={imageRef}
						/>
					) : isCompleted ? (
						<CompletedChallengeCard
							challenge={challenge}
							uploadedImage={uploadedImage}
							imageJustUploaded={imageJustUploaded}
							isEditing={isEditing}
							imageTransform={imageTransform}
							onPhotoUpload={openPhotoUpload}
							onStartEditing={startEditing}
							onSaveEditedImage={saveEditedImage}
							onStopEditing={stopEditing}
							onMouseDown={handleMouseDown}
							onMouseMove={handleMouseMove}
							onMouseUp={handleMouseUp}
							onTouchStart={handleTouchStart}
							onTouchMove={handleTouchMove}
							onTouchEnd={handleTouchEnd}
							onWheel={handleWheel}
							imageRef={imageRef}
							editorRef={editorRef}
						/>
					) : (
						<IncompleteChallengeCard
							challenge={challenge}
							onScanClick={openScannerModal}
							isCompleting={isCompleting}
						/>
					)}
				</div>

				{/* Hidden file input for photo upload */}
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					onChange={handlePhotoUpload}
					className="hidden"
				/>

				{/* QR Scanner Modal */}
				{isScanning && (
					<QRScannerModal
						isScanning={isScanning}
						scanResult={scanResult}
						onClose={closeScannerModal}
						onResetAndScanAgain={resetAndScanAgain}
						videoRef={videoRef}
						overlayCanvasRef={overlayCanvasRef}
					/>
				)}

				{/* Success Card Modal */}
				{showSuccessCard && (
					<SuccessPopup
						challenge={challenge}
						onContinue={handleContinueToCompletion}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
