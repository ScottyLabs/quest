import { parseAsInteger, useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { type Challenge, Poster } from "@/components/poster";

export function App() {
	// Manage current challenge index in URL
	const [currentIndex, setCurrentIndex] = useQueryState(
		"challenge",
		parseAsInteger.withDefault(0),
	);

	const [isAutoPrinting, setIsAutoPrinting] = useState(false);
	const [printProgress, setPrintProgress] = useState(0);
	const [printedCount, setPrintedCount] = useState(0);

	const dataBase64 = import.meta.env.VITE_DATA_BASE64;
	if (!dataBase64) throw new Error("VITE_DATA_BASE64 is not set");

	const jsonString = new TextDecoder().decode(
		Uint8Array.from(window.atob(dataBase64), (c) => c.charCodeAt(0)),
	);
	const challenges: Challenge[] = JSON.parse(jsonString);

	// Ensure currentIndex is within bounds
	const safeCurrentIndex = Math.max(
		0,
		Math.min(currentIndex, challenges.length - 1),
	);

	const printCurrentChallenge = () => {
		// Hide the control panel temporarily
		const controlPanel = document.querySelector(
			".control-panel",
		) as HTMLElement;

		if (controlPanel) {
			controlPanel.style.display = "none";
		}

		// Trigger browser print
		window.print();

		// Show control panel again after print dialog
		setTimeout(() => {
			if (controlPanel) {
				controlPanel.style.display = "block";
			}
		}, 1000);
	};

	const printAllChallenges = async () => {
		const message = `This will open ${challenges.length} print dialogs one by one. Once your browser remembers the initial download location, you can just press and hold enter for 3-4 minutes.`;

		if (!window.confirm(message)) return;

		setIsAutoPrinting(true);
		setPrintProgress(0);
		setPrintedCount(0);

		for (let i = 0; i < challenges.length; i++) {
			console.log(
				`Printing challenge ${i + 1}/${challenges.length}: ${challenges[i].name}`,
			);
			await setCurrentIndex(i);

			// Hide control panel
			const controlPanel = document.querySelector(
				".control-panel",
			) as HTMLElement;
			if (controlPanel) {
				controlPanel.style.display = "none";
			}

			window.print();

			// Show control panel again
			if (controlPanel) {
				controlPanel.style.display = "block";
			}

			setPrintedCount(i + 1);
			setPrintProgress(((i + 1) / challenges.length) * 100);
		}

		setIsAutoPrinting(false);
		alert(
			`Batch printing complete!\nProcessed ${challenges.length} challenges.`,
		);
	};

	const currentChallenge = challenges[safeCurrentIndex];

	// Update document title to set default PDF filename
	useEffect(() => {
		if (!currentChallenge) return;
		const sanitizedName = currentChallenge.name
			.replace(/[^a-z0-9]/gi, "_")
			.replace(/_+/g, "_")
			.replace(/^_|_$/g, "")
			.toLowerCase();

		document.title = `${String(safeCurrentIndex).padStart(3, "0")}_${sanitizedName}`;
	}, [currentChallenge, safeCurrentIndex]);

	if (!currentChallenge) {
		return (
			<div className="min-h-screen bg-gray-100 flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-red-600 mb-4">
						No challenges data found
					</h1>
					<p className="text-gray-600">
						Make sure the qr_challenges.json file is in src/data/
					</p>
				</div>
			</div>
		);
	}

	const goToPrevious = () => {
		const newIndex = Math.max(0, safeCurrentIndex - 1);
		setCurrentIndex(newIndex);
	};

	const goToNext = () => {
		const newIndex = Math.min(challenges.length - 1, safeCurrentIndex + 1);
		setCurrentIndex(newIndex);
	};

	return (
		<div className="min-h-screen bg-gray-100 font-sans">
			{/* Control Panel */}
			<div className="control-panel fixed top-4 left-4 bg-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
				<h2 className="text-lg font-bold mb-3">QR Code Printer</h2>

				<div className="mb-3">
					<p className="text-sm text-gray-600">
						Challenge {safeCurrentIndex + 1} of {challenges.length}
					</p>
					<p className="font-medium text-sm">{currentChallenge.name}</p>
					<p className="text-xs text-gray-500">{currentChallenge.category}</p>
				</div>

				{!isAutoPrinting ? (
					<div className="space-y-2">
						<button
							type="button"
							onClick={printCurrentChallenge}
							className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
						>
							Print Current Challenge
						</button>

						<button
							type="button"
							onClick={printAllChallenges}
							className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
						>
							Print All Challenges ({challenges.length})
						</button>

						<div className="flex space-x-2">
							<button
								type="button"
								onClick={goToPrevious}
								disabled={safeCurrentIndex === 0}
								className="flex-1 bg-gray-300 text-gray-700 px-3 py-1 rounded disabled:opacity-50 hover:bg-gray-400 transition-colors text-sm"
							>
								← Prev
							</button>
							<button
								type="button"
								onClick={goToNext}
								disabled={safeCurrentIndex === challenges.length - 1}
								className="flex-1 bg-gray-300 text-gray-700 px-3 py-1 rounded disabled:opacity-50 hover:bg-gray-400 transition-colors text-sm"
							>
								Next →
							</button>
						</div>

						{/* Quick jump input */}
						<div className="flex justify-between items-center">
							<div className="flex space-x-2">
								<label
									htmlFor="jump-to-input"
									className="text-xs text-gray-500 my-auto"
								>
									Jump to:
								</label>

								<input
									id="jump-to-input"
									type="text"
									placeholder="0"
									value={safeCurrentIndex}
									onChange={(e) => {
										const value = e.target.value;
										// Allow empty string or valid numbers
										if (value === "" || /^\d+$/.test(value)) {
											const numValue = value === "" ? 0 : parseInt(value);
											if (numValue >= 0 && numValue < challenges.length) {
												setCurrentIndex(numValue);
											}
										}
									}}
									onBlur={(e) => {
										// Ensure we have a valid value on blur
										const value = e.target.value;
										if (value === "" || Number.isNaN(parseInt(value))) {
											setCurrentIndex(0);
										}
									}}
									className="px-2 py-1 my-auto text-xs border border-gray-300 rounded text-center"
									style={{ width: "60px" }}
								/>
								<span className="text-xs my-auto text-gray-400">
									/ {challenges.length - 1}
								</span>
							</div>

							<p className="text-xs text-blue-600 font-mono">
								?challenge={safeCurrentIndex}
							</p>
						</div>
					</div>
				) : (
					<div className="space-y-3">
						<div>
							<div className="flex justify-between text-sm mb-1">
								<span>Auto-printing...</span>
								<span>
									{printedCount}/{challenges.length}
								</span>
							</div>
							<div className="w-full bg-gray-200 rounded-full h-2">
								<div
									className="bg-green-600 h-2 rounded-full transition-all duration-300"
									style={{ width: `${printProgress}%` }}
								></div>
							</div>
						</div>

						<p className="text-xs text-gray-500">
							Handle the print dialog, then the next challenge will
							automatically load.
						</p>
					</div>
				)}
			</div>

			<Poster
				key={safeCurrentIndex} // Force re-render when challenge changes
				category={currentChallenge.category}
				name={currentChallenge.name}
				tagline={currentChallenge.tagline}
				secret={currentChallenge.secret}
			/>
		</div>
	);
}
