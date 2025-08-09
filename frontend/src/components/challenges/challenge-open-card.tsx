import { Camera, Check, Edit, ExternalLink, QrCode, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import ScottyCoin from "@/assets/scotty-coin.svg?react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTrigger,
} from "@/components/ui/dialog";
import { callWithQR } from "@/lib/native/scanner";
import type { components } from "@/lib/schema.gen";

interface ChallengeOpenCardProps {
	challenge: components["schemas"]["AdminChallengeResponse"];
	children: React.ReactNode;
	onChallengeComplete?: (challengeName: string, coinsEarned: number) => void;
}

export function ChallengeOpenCard({
	challenge,
	children,
	onChallengeComplete,
}: ChallengeOpenCardProps) {
	const [isScanning, setIsScanning] = useState(false);
	const [scanResult, setScanResult] = useState("");

	const [error, setError] = useState("");
	const [showErrorPopup, setShowErrorPopup] = useState(false);
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

	const completeChallenge = useCallback(async () => {
		setIsCompleting(true);
		try {
			// Call the completion API
			const response = await fetch("/api/complete", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					challenge_name: challenge.name,
					verification_code: challenge.secret,
					image_data: uploadedImage || "", // Base64 image data
					note: "",
				}),
			});

			const result = await response.json();
			if (result.success) {
				setIsCompleted(true);
				if (onChallengeComplete) {
					onChallengeComplete(challenge.name, challenge.scotty_coins);
				}
			} else {
				setError(result.message || "Failed to complete challenge");
				setShowErrorPopup(true);
			}
		} catch (err) {
			setError("Failed to complete challenge");
			setShowErrorPopup(true);
			console.error("Completion error:", err);
		} finally {
			setIsCompleting(false);
		}
	}, [
		challenge.name,
		challenge.secret,
		challenge.scotty_coins,
		uploadedImage,
		onChallengeComplete,
	]);

	const startScanning = useCallback(async () => {
		// If challenge is already completed, don't scan again
		if (isCompleted) {
			return;
		}

		if (!videoRef.current || !overlayCanvasRef.current) {
			setError("Video or overlay canvas not available");
			setShowErrorPopup(true);
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
					setError("");
					// Stop video stream
					if (videoRef.current?.srcObject) {
						const stream = videoRef.current.srcObject as MediaStream;
						stream.getTracks().forEach((track) => track.stop());
						videoRef.current.srcObject = null;
					}
				} else {
					setError("Invalid QR code. Please try again.");
					setShowErrorPopup(true);
				}
			} else {
				setError("No QR code found or camera access denied");
				setShowErrorPopup(true);
			}
		} catch (err) {
			setError("An error occurred while scanning");
			setShowErrorPopup(true);
			console.error("QR scan error:", err);
		}
	}, [handleQRCode, challenge.secret, isCompleted]);

	const resetAndScanAgain = () => {
		setScanResult("");
		setError("");
		setShowErrorPopup(false);
		setShowSuccessCard(false);
		setShowPhotoEditCard(false);
		startScanning();
	};

	const openScannerModal = () => {
		if (isCompleted) {
			return;
		}
		setIsScanning(true);
		setScanResult("");
		setError("");
		// Start scanning after a small delay to ensure modal is rendered
		setTimeout(() => {
			startScanning();
		}, 100);
	};

	const closeScannerModal = () => {
		setIsScanning(false);
		setScanResult("");
		setError("");
		setShowErrorPopup(false);
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
				setTimeout(() => {
					setImageJustUploaded(false);
				}, 3000);
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
		const editor = editorRef.current;

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

	const closeErrorPopup = () => {
		setShowErrorPopup(false);
		setError("");
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
		setError("");
		setShowErrorPopup(false);
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
						<div className="flex flex-col justify-start items-center gap-6 px-6 flex-1">
							{/* Large Image Holder with Grid Overlay */}
							<div className="w-full flex flex-col justify-center items-center relative">
								<div
									className={`relative w-full aspect-square rounded-3xl overflow-hidden ${isEditing ? "cursor-move ring-2 ring-blue-400 select-none touch-none" : ""}`}
									{...(isEditing
										? {
												onMouseDown: handleMouseDown,
												onMouseMove: handleMouseMove,
												onMouseUp: handleMouseUp,
												onTouchStart: handleTouchStart,
												onTouchMove: handleTouchMove,
												onTouchEnd: handleTouchEnd,
												onWheel: handleWheel,
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
											onClick={startEditing}
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
											onClick={stopEditing}
											className="flex-1 h-12 px-6 py-3 bg-red-500 rounded-3xl flex justify-center items-center gap-2 hover:bg-red-600 transition-colors"
										>
											<X className="w-6 h-6 text-white" />
											<div className="text-center justify-start text-white text-base font-bold font-['Open_Sans'] leading-normal">
												Cancel
											</div>
										</button>
										<button
											type="button"
											onClick={saveEditedImage}
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
											onClick={handlePhotoEditReplace}
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
											onClick={handlePhotoEditContinue}
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
					) : (
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
														onMouseDown: handleMouseDown,
														onMouseMove: handleMouseMove,
														onMouseUp: handleMouseUp,
														onTouchStart: handleTouchStart,
														onTouchMove: handleTouchMove,
														onTouchEnd: handleTouchEnd,
														onWheel: handleWheel,
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
										{isCompleted && !isEditing && (
											<button
												type="button"
												onClick={startEditing}
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
													onClick={saveEditedImage}
													className="w-8 h-8 bg-green-500 rounded-full shadow-lg flex items-center justify-center hover:bg-green-600 transition-colors"
													title="Save changes"
												>
													<Check className="w-4 h-4 text-white" />
												</button>
												<button
													type="button"
													onClick={stopEditing}
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
										{isCompleted && !uploadedImage && (
											<Check className="w-16 h-16 text-green-500" />
										)}
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

									{/* Reward */}
									{!isCompleted && (
										<div className="w-full h-11 bg-rose-700 rounded-xl shadow-[0px_6px_0px_0px_rgba(154,16,35,1.00)] flex items-center justify-center px-4">
											<div className="flex items-center gap-2">
												<div className="justify-start text-white text-base font-bold font-['Open_Sans'] tracking-tight">
													Reward: +{challenge.scotty_coins}
												</div>
												<ScottyCoin className="w-5 h-5 bg-yellow-400 rounded-full" />
											</div>
										</div>
									)}
								</div>

								{/* Scan Button or Photo Upload Button */}
								{!isCompleted ? (
									<div className="w-full h-12 inline-flex justify-center items-center">
										<div className="flex-1 h-12 flex justify-center items-center">
											<button
												type="button"
												onClick={openScannerModal}
												disabled={isCompleting}
												className="flex-1 h-12 px-8 py-3 bg-red-700 rounded-3xl flex justify-center items-center gap-2 disabled:opacity-50"
											>
												<div className="w-7 h-7 relative overflow-hidden">
													<QrCode className="w-6 h-6 text-white" />
												</div>
												<div className="text-center justify-start text-white text-base font-bold font-['Open_Sans'] leading-normal">
													Scan QR Code
												</div>
											</button>
										</div>
									</div>
								) : (
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
														onClick={openPhotoUpload}
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
													onClick={openPhotoUpload}
													className="flex-1 h-12 px-8 py-3 bg-red-700  rounded-3xl flex justify-center items-center gap-2"
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
								)}
							</div>
						</div>
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
					<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
						<div className="bg-white w-full h-full flex flex-col">
							{/* Header */}
							<div className="flex justify-between items-center p-4 border-b">
								<h3 className="text-lg font-semibold">QR Code Scanner</h3>
								<button
									type="button"
									onClick={closeScannerModal}
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
										{scanResult === challenge.secret ? (
											<div className="mt-3 text-green-600 font-semibold">
												✓ Valid QR code! Challenge completed.
											</div>
										) : (
											<div className="mt-3 text-red-600 font-semibold">
												✗ Invalid QR code. Please try again.
											</div>
										)}
										<div className="mt-3 flex gap-2">
											<button
												type="button"
												onClick={resetAndScanAgain}
												className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
											>
												Scan Another
											</button>
											<button
												type="button"
												onClick={closeScannerModal}
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
				)}

				{/* Success Card Modal */}
				{showSuccessCard && (
					<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
						<div className="bg-white w-[90%] sm:max-w-xl sm:w-full h-auto max-h-[800px] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
							{/* Header */}
							<div className="min-h-14 px-6 py-3 bg-white rounded-[10px] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] flex justify-between items-center mx-6 mt-4">
								<div className="flex-1 min-w-0">
									<div className="text-gray-800 text-2xl font-extrabold font-['Open_Sans'] tracking-wide break-words">
										{challenge.name}
									</div>
								</div>
							</div>

							{/* Content */}
							<div className="flex flex-col justify-start items-center gap-16 px-6 flex-1">
								{/* Success Icon */}
								<div className="w-full max-w-72 flex flex-col justify-start items-center gap-8 mt-8">
									<div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center">
										<Check className="w-16 h-16 text-green-600" />
									</div>

									{/* Success Message */}
									<div className="text-center">
										<h3 className="text-2xl font-bold text-green-800 mb-2">
											QR Code Verified!
										</h3>
										<p className="text-gray-600">
											Great job! You've successfully scanned the QR code for
											this challenge.
										</p>
									</div>

									{/* Reward Display */}
									<div className="w-full h-11 bg-rose-700 rounded-xl shadow-[0px_6px_0px_0px_rgba(154,16,35,1.00)] flex items-center justify-center px-4">
										<div className="flex items-center gap-2">
											<div className="justify-start text-white text-base font-bold font-['Open_Sans'] tracking-tight">
												Reward: +{challenge.scotty_coins}
											</div>
											<ScottyCoin className="w-5 h-5 bg-yellow-400 rounded-full" />
										</div>
									</div>
								</div>
							</div>

							{/* Continue Button */}
							<div className="w-full  h-12 mx-auto mb-6 inline-flex justify-center items-center px-6 mt-6">
								<button
									type="button"
									onClick={handleContinueToCompletion}
									className="flex-1 h-12 px-8 py-3 bg-red-700 rounded-3xl flex justify-center items-center gap-2 hover:bg-red-800 transition-colors"
								>
									<div className="text-center justify-start text-white text-base font-bold font-['Open_Sans'] leading-normal">
										Continue
									</div>
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Error Popup Modal */}
				{showErrorPopup && (
					<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
						<div className="bg-white rounded-2xl max-w-md w-full mx-4 shadow-2xl">
							{/* Header */}
							<div className="flex justify-between items-center p-6 border-b">
								<h3 className="text-lg font-semibold text-red-800">Error</h3>
								<button
									type="button"
									onClick={closeErrorPopup}
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
									onClick={closeErrorPopup}
									className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
								>
									OK
								</button>
							</div>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
