import { ExternalLink, QrCode } from "lucide-react";
import ScottyCoin from "@/assets/scotty-coin.svg?react";
import type { Challenge } from "@/components/challenges/card";

interface IncompleteChallengeCardProps {
	challenge: Challenge;
	onScanClick: () => void;
	isCompleting: boolean;
}

export function IncompleteChallengeCard({
	challenge,
	onScanClick,
	isCompleting,
}: IncompleteChallengeCardProps) {
	return (
		<div className="flex flex-col justify-start items-center gap-4 px-6">
			{/* Image placeholder */}
			<div className="w-full flex flex-col justify-center items-center relative">
				<div className="w-52 h-52 bg-gray-100 rounded-3xl flex items-center justify-center relative">
					{/* Placeholder content */}
				</div>
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
									<a
										href={challenge.maps_link ?? "https://cmumaps.com"}
										target="_blank"
										rel="noopener noreferrer"
										className="justify-start text-default text-base font-semibold font-['Open_Sans'] underline tracking-tight"
									>
										{challenge.location}
									</a>
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
											className="justify-start text-default text-base font-semibold font-['Open_Sans'] underline tracking-tight"
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
					<div className="w-full h-11 bg-rose-700 rounded-xl shadow-[0px_7px_0px_0px_var(--color-default-selected)] flex items-center justify-center px-4">
						<div className="flex items-center gap-2">
							<div className="justify-start text-white text-base font-bold font-['Open_Sans'] tracking-tight">
								Reward: +{challenge.scotty_coins}
							</div>
							<ScottyCoin className="w-5 h-5 bg-yellow-400 rounded-full" />
						</div>
					</div>
				</div>

				{/* Scan Button */}
				<div className="w-full h-12 inline-flex justify-center items-center">
					<div className="flex-1 h-12 flex justify-center items-center">
						<button
							type="button"
							onClick={onScanClick}
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
			</div>
		</div>
	);
}
