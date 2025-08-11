import { Check } from "lucide-react";
import ScottyCoin from "@/assets/scotty-coin.svg?react";
import type { Challenge } from "@/components/challenges";

interface SuccessPopupProps {
	challenge: Challenge;
	onContinue: () => void;
}

export function SuccessPopup({ challenge, onContinue }: SuccessPopupProps) {
	return (
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
								Great job! You've successfully scanned the QR code for this
								challenge.
							</p>
						</div>

						{/* Reward Display */}
						<div className="w-full h-11 bg-rose-700 rounded-xl shadow-[0px_7px_0px_0px_var(--color-default-selected)] flex items-center justify-center px-4">
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
				<div className="w-full h-12 mx-auto mb-6 inline-flex justify-center items-center px-6 mt-6">
					<button
						type="button"
						onClick={onContinue}
						className="flex-1 h-12 px-8 py-3 bg-red-700 rounded-3xl flex justify-center items-center gap-2 hover:bg-red-800 transition-colors"
					>
						<div className="text-center justify-start text-white text-base font-bold font-['Open_Sans'] leading-normal">
							Continue
						</div>
					</button>
				</div>
			</div>
		</div>
	);
}
