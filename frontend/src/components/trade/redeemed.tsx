import Check from "@/assets/redeemed-check.svg?react";

interface RedeemProps {
	setDrawerOpen: (open: boolean) => void;
	prize: {
		name: string;
		amount?: number;
		date?: string;
	};
}

export function Redeemed({ setDrawerOpen, prize }: RedeemProps) {
	return (
		<div className="flex flex-col items-center justify-center p-6">
			<Check className="w-48 h-48 my-8" />
			<h2 className="text-4xl font-bold mb-4">Redeemed!</h2>
			<p className="text-2xl mb-4 p-10">
				You redeemed {prize.amount || 1} {prize.name}! You can see your prizes
				in your profile! Pick up your prize by visiting this prize again and
				showing an admin your transaction QR code!
			</p>
			<button
				type="button"
				className="self-center card-selected border-4 border-green-600 bg-green-400 text-white cursor-pointer w-80 h-20 inline-flex justify-center items-center mb-4 px-4 py-2 text-2xl font-extrabold rounded-2xl"
			>
				Show QR Code
			</button>
			<button
				type="button"
				className="self-center card-selected border-4 border-default-selected bg-default text-white cursor-pointer w-80 h-20 inline-flex justify-center items-center mb-4 px-4 py-2 text-2xl font-extrabold rounded-2xl"
				onClick={() => setDrawerOpen(false)}
			>
				Go Back
			</button>
		</div>
	);
}
