import { Trophy } from "lucide-react";

const colors = {
	"The Essentials": {
		dark: "bg-challenge-1",
		light: "bg-challenge-1-light",
		arc: "[--arc-color:theme(colors.challenge-1-light)]",
	},
	"Campus of Bridges": {
		dark: "bg-challenge-2",
		light: "bg-challenge-2-light",
		arc: "[--arc-color:theme(colors.challenge-2-light)]",
	},
	"Let's Eat": {
		dark: "bg-challenge-3",
		light: "bg-challenge-3-light",
		arc: "[--arc-color:theme(colors.challenge-3-light)]",
	},
	"Cool Corners of Carnegie": {
		dark: "bg-challenge-4",
		light: "bg-challenge-4-light",
		arc: "[--arc-color:theme(colors.challenge-4-light)]",
	},
	"Minor-Major General": {
		dark: "bg-challenge-5",
		light: "bg-challenge-5-light",
		arc: "[--arc-color:theme(colors.challenge-5-light)]",
	},
	"Off-Campus Adventures": {
		dark: "bg-challenge-6",
		light: "bg-challenge-6-light",
		arc: "[--arc-color:theme(colors.challenge-6-light)]",
	},
} as const;

export function App() {
	const category = "Off-Campus Adventures";
	const color = colors[category];

	return (
		<div className="mt-12 font-sans">
			<div
				className={`print-content relative mx-auto shadow-lg w-[8.5in] h-[11in] transform-[scale(0.65)] origin-top ${color.light}`}
			>
				{/* Top banner */}
				<div className={`absolute flex items-end w-full ${color.dark} h-[2in]`}>
					<svg
						className={color.arc}
						viewBox="0 0 375 60"
						width="100%"
						height="60"
						preserveAspectRatio="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<title>Arc</title>
						<path
							d="M0,60 Q178,-57 375,60 L375,60 L0,60 Z"
							fill="var(--arc-color, white)"
						/>
					</svg>
				</div>

				{/* Bottom banner */}
				<div
					className={`flex absolute bottom-0 w-full ${color.dark} h-[1.5in]`}
				>
					<div className="shrink-0 py-4 w-full text-white text-center">
						<p className="text-lg font-bold">
							Visit https://cmu.quest to scan this code
						</p>
						<p>Do not remove. Property of First-Year Orientation.</p>
					</div>

					<div className="flex-grow" />
				</div>

				{/* Work inside the margins */}
				<div className={`absolute top-0 left-0 size-full p-[0.75in]`}>
					{/* Center icon */}
					<div
						className={`rounded-full border-8 border-white size-[1.25in] mx-auto flex items-center justify-center ${color.dark}`}
					>
						<Trophy className="text-white stroke-2 size-1/2" />
					</div>

					{/* Category name */}
					<p className={`mt-2 text-center text-2xl font-black text-white`}>
						{category}
					</p>

					{/* Center content */}
					<div className="bg-white size-[6in] flex flex-col justify-around mx-auto mt-12 rounded-2xl p-6">
						<h1 className="text-4xl text-center font-bold mx-auto">
							Green Thumb From Phipps
						</h1>

						<div className="bg-gray-100 flex items-center justify-center size-[4in] mx-auto">
							<p className="text-gray-400 italic">QR code here</p>
						</div>

						<p className="mx-auto">Visit Phipps Conservatory!</p>
					</div>
				</div>
			</div>
		</div>
	);
}
