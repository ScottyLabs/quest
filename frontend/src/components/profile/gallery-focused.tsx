import { Camera, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChallengeOpenCard } from "@/components/challenges/challenge-open-card";
import type { components } from "@/lib/schema.gen";

interface GalleryFocusedProps {
	entries: components["schemas"]["JournalEntry"][];
	onClose?: () => void;
}

interface CardPosition {
	x: number;
	y: number;
	rotation: number;
	scale: number;
	opacity: number;
}

export function GalleryFocused({ entries, onClose }: GalleryFocusedProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const [cardPositions, setCardPositions] = useState<CardPosition[]>([]);

	const containerRef = useRef<HTMLButtonElement>(null);
	const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

	// Initialize card positions
	useEffect(() => {
		const positions: CardPosition[] = entries.map((_, index) => {
			if (index === currentIndex) {
				return { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };
			} else if (index < currentIndex) {
				return { x: -100, y: 0, rotation: -15, scale: 0.8, opacity: 0.3 };
			} else {
				return { x: 100, y: 0, rotation: 15, scale: 0.8, opacity: 0.3 };
			}
		});
		setCardPositions(positions);
	}, [entries, currentIndex]);

	const handleTouchStart = useCallback((e: React.TouchEvent) => {
		e.preventDefault();
		const touch = e.touches[0];
		if (!touch) return;
		setIsDragging(true);
		setDragStart({ x: touch.clientX, y: touch.clientY });
		setDragOffset({ x: 0, y: 0 });
	}, []);

	const handleTouchMove = useCallback(
		(e: React.TouchEvent) => {
			e.preventDefault();
			if (!isDragging) return;

			const touch = e.touches[0];
			if (!touch) return;
			const deltaX = touch.clientX - dragStart.x;
			const deltaY = touch.clientY - dragStart.y;

			setDragOffset({ x: deltaX, y: deltaY });
		},
		[isDragging, dragStart],
	);

	const handleTouchEnd = useCallback(() => {
		if (!isDragging) return;

		setIsDragging(false);
		const threshold = 100;

		if (Math.abs(dragOffset.x) > threshold) {
			if (dragOffset.x > 0 && currentIndex > 0) {
				// Swipe right - go to previous
				setCurrentIndex((prev) => prev - 1);
			} else if (dragOffset.x < 0 && currentIndex < entries.length - 1) {
				// Swipe left - go to next
				setCurrentIndex((prev) => prev + 1);
			}
		}

		setDragOffset({ x: 0, y: 0 });
	}, [isDragging, dragOffset, currentIndex, entries.length]);

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsDragging(true);
		setDragStart({ x: e.clientX, y: e.clientY });
		setDragOffset({ x: 0, y: 0 });
	}, []);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			if (!isDragging) return;

			const deltaX = e.clientX - dragStart.x;
			const deltaY = e.clientY - dragStart.y;

			setDragOffset({ x: deltaX, y: deltaY });
		},
		[isDragging, dragStart],
	);

	const handleMouseUp = useCallback(() => {
		if (!isDragging) return;

		setIsDragging(false);
		const threshold = 100;

		if (Math.abs(dragOffset.x) > threshold) {
			if (dragOffset.x > 0 && currentIndex > 0) {
				// Swipe right - go to previous
				setCurrentIndex((prev) => prev - 1);
			} else if (dragOffset.x < 0 && currentIndex < entries.length - 1) {
				// Swipe left - go to next
				setCurrentIndex((prev) => prev + 1);
			}
		}

		setDragOffset({ x: 0, y: 0 });
	}, [isDragging, dragOffset, currentIndex, entries.length]);

	const goToPrevious = useCallback(() => {
		if (currentIndex > 0) {
			setCurrentIndex((prev) => prev - 1);
		}
	}, [currentIndex]);

	const goToNext = useCallback(() => {
		if (currentIndex < entries.length - 1) {
			setCurrentIndex((prev) => prev + 1);
		}
	}, [currentIndex, entries.length]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "ArrowLeft") {
				goToPrevious();
			} else if (e.key === "ArrowRight") {
				goToNext();
			} else if (e.key === "Escape") {
				onClose?.();
			}
		},
		[goToPrevious, goToNext, onClose],
	);

	useEffect(() => {
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [handleKeyDown]);

	if (entries.length === 0) {
		return (
			<div className="w-96 h-[972px] relative bg-black/75 flex items-center justify-center">
				<div className="text-center text-white">
					<Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
					<p className="text-xl font-bold">No Gallery Entries</p>
					<p className="text-sm opacity-75">
						Complete challenges to see your gallery!
					</p>
				</div>
			</div>
		);
	}

	const currentEntry = entries[currentIndex];
	if (!currentEntry) {
		return (
			<div className="w-96 h-[972px] relative bg-black/75 flex items-center justify-center">
				<div className="text-center text-white">
					<p className="text-xl font-bold">No Entry Found</p>
				</div>
			</div>
		);
	}

	const challengeData = {
		name: currentEntry.challenge_name,
		tagline: currentEntry.challenge_tagline,
		location: currentEntry.challenge_location,
		category: currentEntry.challenge_category,
		scotty_coins: currentEntry.coins_earned,
		status: "completed" as const,
		secret: "",
		unlock_timestamp: "",
		description: currentEntry.challenge_tagline || "",
	};

	return (
		<div className="w-96 h-[972px] relative">
			{/* Background overlay */}
			<div className="w-96 h-[972px] left-0 top-0 absolute bg-black/75"></div>

			{/* Card stack background layers */}
			<div className="w-96 h-[574px] left-[67px] top-[257px] absolute opacity-60 bg-zinc-500 rounded-2xl"></div>
			<div className="w-96 h-[583px] left-[54.96px] top-[236px] absolute bg-neutral-200 rounded-2xl"></div>
			<div className="w-96 h-[583.46px] left-[31.69px] top-[223.31px] absolute bg-Highlight rounded-2xl"></div>

			{/* Header */}
			<div className="left-[32px] top-[127px] absolute inline-flex justify-start items-center gap-20">
				<div className="flex justify-start items-center gap-2">
					<div className="w-14 h-14 relative overflow-hidden">
						<div className="w-3.5 h-3.5 left-[21.75px] top-[23.97px] absolute bg-white"></div>
						<div className="w-12 h-10 left-[3.62px] top-[9.22px] absolute bg-white"></div>
						<div className="w-96 h-96 left-[-152.98px] top-[-151.65px] absolute"></div>
					</div>
					<div className="justify-start text-Highlight text-3xl font-bold font-['Open_Sans'] tracking-tight">
						Gallery
					</div>
				</div>

				{/* Progress indicators */}
				{entries.map((entry, index) => (
					<div
						key={`progress-${entry.challenge_name}-${entry.completed_at}`}
						className={`w-10 h-14 origin-top-left rotate-[26.82deg] rounded-lg border ${
							index === currentIndex
								? "bg-Highlight border-neutral-200"
								: "bg-neutral-200"
						}`}
					></div>
				))}

				<div className="justify-start text-black text-xl font-extrabold font-['Open_Sans'] tracking-tight">
					{currentIndex + 1}/{entries.length}
				</div>
			</div>

			{/* Main card container */}
			<button
				ref={containerRef}
				className="w-56 left-[113.98px] top-[333px] absolute inline-flex flex-col justify-start items-start bg-transparent border-none p-0"
				type="button"
				onTouchStart={handleTouchStart}
				onTouchMove={handleTouchMove}
				onTouchEnd={handleTouchEnd}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseUp}
			>
				{entries.map((entry, index) => {
					const position = cardPositions[index] || {
						x: 0,
						y: 0,
						rotation: 0,
						scale: 1,
						opacity: 1,
					};
					const isCurrent = index === currentIndex;
					const dragX = isCurrent ? dragOffset.x : 0;
					const dragY = isCurrent ? dragOffset.y : 0;

					return (
						<div
							key={`card-${entry.challenge_name}-${entry.completed_at}`}
							ref={(el) => {
								cardRefs.current[index] = el;
							}}
							className={`absolute w-52 h-52 transition-all duration-300 ease-out ${
								isCurrent ? "z-10" : "z-0"
							}`}
							style={{
								transform: `translate(${position.x + dragX}px, ${position.y + dragY}px) rotate(${position.rotation}deg) scale(${position.scale})`,
								opacity: position.opacity,
								pointerEvents: isCurrent ? "auto" : "none",
							}}
						>
							{isCurrent && (
								<ChallengeOpenCard challenge={challengeData}>
									<div className="w-full h-full">
										<div className="w-52 h-52 py-5 flex flex-col justify-center items-start gap-2.5">
											<img
												className="w-60 h-52 rounded-3xl object-cover"
												src={entry.image_url || "https://placehold.co/235x202"}
												alt={entry.challenge_name}
											/>
										</div>
										<div className="self-stretch pt-[5px] pb-2.5 inline-flex justify-start items-center gap-2.5">
											<div className="justify-start text-Steel-Grey text-xs font-normal font-['Open_Sans'] tracking-tight">
												Taken on{" "}
												{new Date(entry.completed_at).toLocaleDateString()} at{" "}
												{new Date(entry.completed_at).toLocaleTimeString()}
											</div>
										</div>
									</div>
								</ChallengeOpenCard>
							)}
						</div>
					);
				})}
			</button>

			{/* Challenge title */}
			<div className="w-80 h-14 px-4 py-3 left-[51.90px] top-[244px] absolute bg-white rounded-[10px] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] inline-flex justify-start items-center gap-4">
				<div className="w-60 inline-flex flex-col justify-start items-start gap-1">
					<div className="self-stretch justify-start text-Secondary text-2xl font-extrabold font-['Open_Sans'] tracking-wide">
						{currentEntry.challenge_name}
					</div>
				</div>
			</div>

			{/* Navigation buttons */}
			<div className="w-80 h-12 left-[50.89px] top-[721px] absolute inline-flex justify-center items-center">
				<div className="flex-1 h-12 px-8 py-3 bg-Primary rounded-3xl flex justify-center items-center gap-2">
					<div className="w-7 h-7 relative overflow-hidden">
						<div className="w-1.5 h-2 left-[10.50px] top-[11.78px] absolute bg-Highlight"></div>
						<div className="w-6 h-5 left-[1.75px] top-[4.53px] absolute bg-Highlight"></div>
						<div className="w-44 h-44 left-[-73.85px] top-[-74.54px] absolute"></div>
					</div>
					<div className="text-center justify-start text-Highlight text-base font-bold font-['Open_Sans'] leading-normal">
						Picture
					</div>
				</div>
			</div>

			{/* Description */}
			<div className="w-80 h-28 left-[54.97px] top-[579px] absolute inline-flex flex-col justify-start items-start gap-[3px]">
				<div className="self-stretch inline-flex justify-center items-center gap-2.5">
					<div className="flex-1 justify-start text-Tertiary text-base font-semibold font-['Open_Sans'] tracking-tight">
						Description:
					</div>
				</div>
				<div className="self-stretch inline-flex justify-center items-center gap-2.5">
					<div className="flex-1 justify-start text-Steel-Grey text-xs font-normal font-['Open_Sans'] tracking-tight">
						{currentEntry.note ||
							"Sed ut orci vitae eros egestas euismod. Praesent ut orci sagittis justo convallis egestas. Praesent porttitor velit in mauris rutrum, in porta tellus tempus."}
					</div>
				</div>
				<div className="self-stretch inline-flex justify-center items-center gap-2.5">
					<div className="flex-1 justify-start">
						<span className="text-Tertiary text-base font-semibold font-['Open_Sans'] tracking-tight">
							More info:{" "}
						</span>
						<span className="text-Steel-Grey text-base font-semibold font-['Open_Sans'] underline tracking-tight">
							{currentEntry.challenge_location}
						</span>
					</div>
				</div>
			</div>

			{/* Close button */}
			<div className="w-10 h-10 left-[349.87px] top-[253.78px] absolute overflow-hidden">
				<button
					type="button"
					onClick={onClose}
					className="w-5 h-5 left-[10.11px] top-[10.11px] absolute outline outline-4 outline-offset-[-2px] outline-Icon-Default-Default bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
				>
					<X className="w-3 h-3 text-gray-600" />
				</button>
			</div>

			{/* Navigation arrows */}
			{currentIndex > 0 && (
				<button
					type="button"
					onClick={goToPrevious}
					className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
				>
					<ChevronLeft className="w-6 h-6 text-gray-600" />
				</button>
			)}

			{currentIndex < entries.length - 1 && (
				<button
					type="button"
					onClick={goToNext}
					className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
				>
					<ChevronRight className="w-6 h-6 text-gray-600" />
				</button>
			)}
		</div>
	);
}
