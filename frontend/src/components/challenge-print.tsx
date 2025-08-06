import { ChallengeCircle } from "@/components/challenge-circle";
import type { ChallengeData } from "@/lib/challenge-api";

interface ChallengePrintProps {
	challenge: ChallengeData | null;
	colorClasses: {
		bg: string;
		bgLight: string;
		bgSelected: string;
		iconColor: string;
	};
	onHeaderClick: () => void;
}

export function ChallengePrint({
	challenge,
	colorClasses,
	onHeaderClick,
}: ChallengePrintProps) {
	// Debug: Log the challenge data
	console.log("ChallengePrint received challenge:", challenge);
	console.log("ChallengePrint received colorClasses:", colorClasses);

	return (
		<div
			className={`rounded-[50px] ${colorClasses.bg} flex flex-col items-center shadow-[0px_30px_0px_0px_rgba(0,0,0,1.00)] border-[13px] border-black`}
			style={{
				width: "7.5in",
				height: "9.5in",
				printColorAdjust: "exact",
				WebkitPrintColorAdjust: "exact",
			}}
		>
			{/* Header */}
			<button
				type="button"
				className={` ${colorClasses.bg} w-full rounded-t-[34px] px-[48px] py-8 mb-1 cursor-pointer hover:opacity-90 transition-opacity`}
				onClick={onHeaderClick}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						onHeaderClick();
					}
				}}
				aria-label={`Switch to next challenge. Current: ${challenge?.name || "Unknown"}`}
			>
				<div className="w-full flex items-center gap-3 justify-center">
					{/* Challenge Circle - 27% width */}
					<div className="w-[27%] flex justify-center">
						{challenge ? (
							<ChallengeCircle
								category={{
									name: challenge.category,
									color: colorClasses.iconColor,
									completed: 0,
									total: 1,
									flagColor: colorClasses.iconColor,
								}}
								size="lg"
								showIcon={true}
								iconColor={colorClasses.iconColor}
							/>
						) : (
							<div
								className={`w-24 h-24 rounded-full flex items-center justify-center`}
							>
								<div className="w-16 h-16 bg-white rounded-full"></div>
							</div>
						)}
					</div>
					{/* Text - remaining width */}
					<div className="flex-1 text-white text-6xl font-extrabold tracking-wide text-center">
						{challenge?.category || "Unknown"}
					</div>
				</div>
			</button>

			{/* Main Content */}
			<div
				className={`w-full h-[760px] ${colorClasses.bgLight} rounded-b-[34px] p-12`}
				style={{
					printColorAdjust: "exact",
					WebkitPrintColorAdjust: "exact",
				}}
			>
				<div className="bg-white h-full flex flex-col items-center rounded-[20px] p-6 shadow-lg">
					{/* Challenge Name and Location */}
					<div className="bg-white rounded-[10px] w-full flex flex-col items-center shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] p-4 mb-4">
						<div className="flex text-center text-secondary-foreground text-4xl font-extrabold tracking-wide py-1 ">
							{challenge?.name || "Unknown Challenge"}
						</div>
						<div className=" flex text-center text-gray-600 text-2xl font-medium">
							{challenge?.location || "Unknown"}
						</div>
					</div>

					{/* Challenge Details */}
					<div className="space-y-4 mb-4 flex h-full">
						{/* QR Code Placeholder */}
						<div className="bg-gray-50 rounded-lg p-3 w-full aspect-square"></div>

						{/* Secret Code */}
						{/* <div className="bg-gray-50 rounded-lg p-3">
							<div className="text-sm font-semibold text-gray-600 mb-1">
								Secret Code
							</div>
							{/* <div className="text-lg font-mono font-medium bg-gray-100 px-2 py-1 rounded">
								{challenge?.secret || "****"}
							</div> */}
						{/* </div> */}
					</div>

					{/* CMU Property Notice */}
					<div className=" flex text-center text-secondary-foreground text-2xl font-extrabold tracking-wide">
						CMU Property Do Not Remove
					</div>
				</div>
			</div>
		</div>
	);
}
