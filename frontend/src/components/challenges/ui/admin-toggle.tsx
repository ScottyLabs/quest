interface AdminToggleProps {
	mode: "challenges" | "verify";
	onModeChange: (mode: "challenges" | "verify") => void;
}

export function AdminToggle({ mode, onModeChange }: AdminToggleProps) {
	return (
		<div className="bg-white rounded-2xl p-4 shadow-[0_3px_0_#bbb] border-2 border-[#bbb] mb-4">
			<div className="flex items-center justify-between">
				<h3 className="font-bold text-lg text-gray-900">Admin Mode</h3>
				<div className="border border-gray-300 rounded-lg p-1 flex">
					<button
						type="button"
						onClick={() => onModeChange("challenges")}
						className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
							mode === "challenges"
								? "bg-default text-white"
								: "text-gray-700 hover:bg-gray-100"
						}`}
					>
						Challenges
					</button>
					<button
						type="button"
						onClick={() => onModeChange("verify")}
						className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
							mode === "verify"
								? "bg-default text-white"
								: "text-gray-700 hover:bg-gray-100"
						}`}
					>
						Verify
					</button>
				</div>
			</div>
		</div>
	);
}
