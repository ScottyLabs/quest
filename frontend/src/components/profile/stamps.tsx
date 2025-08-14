import { Badge } from "lucide-react";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export type StampsProps = {
	week: boolean[]; // 7 booleans, Sunday to Saturday
};

export default function Stamps({ week }: StampsProps) {
	return (
		<div className="rounded-2xl bg-[#B38156] p-6 max-w-full">
			<div className="flex flex-row justify-between items-center w-full">
				{DAYS.map((day, i) => (
					<div key={day} className="flex flex-col items-center flex-1">
						<div
							className={`relative size-[40px] rounded-full flex items-center justify-center ${
								week[i]
									? "bg-[#F3E9D2] shadow-[0_0_0_8px_#F3E9D2]"
									: "bg-transparent"
							}`}
						>
							<Badge
								size={40}
								color={week[i] ? "#B81C1C" : "#7A4E06"}
								fill={week[i] ? "#B81C1C" : "#7A4E06"}
								strokeWidth={2}
							/>

							<span
								className={`absolute pointer-events-none text-base font-bold ${week[i] ? "text-white" : "text-[#F3E9D2]"}`}
							>
								{day}
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
