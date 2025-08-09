import { Dialog, DialogContent } from "@/components/ui/dialog";

interface RedeemProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	prize: {
		name: string;
		amount?: number;
		date?: string;
	};
}

export function Redeem({ isOpen, onOpenChange, prize }: RedeemProps) {
	const handleGoBack = () => {
		onOpenChange(false);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md bg-white border-none shadow-[0_3px_0_#bbb] p-0">
				<div className="w-96 px-4 py-20 bg-white rounded-[20px] inline-flex flex-col justify-start items-center gap-12">
					<div className="w-72 flex flex-col justify-start items-center gap-3">
						<div className="w-48 h-48 relative">
							<div className="w-48 h-48 left-0 top-0 absolute bg-green-500 rounded-full"></div>
							<div className="w-12 h-11 left-[70.83px] top-[71.48px] absolute outline outline-[17px] outline-offset-[-8.50px] outline-white rounded-full"></div>
						</div>
						<div className="self-stretch flex flex-col justify-start items-center gap-[3px]">
							<div className="w-64 text-center justify-start text-Secondary text-4xl font-extrabold font-['Open_Sans'] tracking-wide">
								Redeemed!
							</div>
							<div className="self-stretch inline-flex justify-center items-center gap-2.5">
								<div className="flex-1 text-center justify-start text-Steel-Grey text-xs font-bold font-['Open_Sans'] tracking-tight">
									You redeemed {prize.amount || 1} {prize.name}! You can see
									your prizes in your profile! *Remember to pick up your{" "}
									{prize.name} on {prize.date || "the specified date"}
								</div>
							</div>
						</div>
					</div>
					<div
						data-dark-mode="False"
						data-left-icon="False"
						data-right-icon="False"
						data-size="Large"
						data-state="Enabled"
						data-type="Primary"
						className="w-72 h-12 shadow-[0px_4px_0px_0px_rgba(54,1,1,1.00)] inline-flex justify-center items-center"
					>
						<button
							type="button"
							onClick={handleGoBack}
							data-size="Large"
							className="flex-1 h-12 px-8 py-3 bg-Primary rounded-3xl flex justify-center items-center gap-2"
						>
							<div className="text-center justify-start text-Highlight text-base font-bold font-['Open_Sans'] leading-normal">
								Go Back
							</div>
						</button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
