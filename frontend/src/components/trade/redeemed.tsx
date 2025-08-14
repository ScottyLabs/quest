import { MoveLeft } from "lucide-react";
import { useState } from "react";
import { QRCode } from "react-qrcode-logo";
import Check from "@/assets/redeemed-check.svg?react";

interface RedeemProps {
	closeDrawer: () => void;
	prize: {
		name: string;
		amount?: number;
		transaction_id: string;
	};
}

export function Redeemed({ closeDrawer, prize }: RedeemProps) {
	const [showQRCode, setShowQRCode] = useState(false);

	return (
		<div className="flex flex-col items-center justify-center p-6">
			{showQRCode ? (
				<div className="flex flex-col items-center justify-center p-4">
					<button
						type="button"
						className="text-2xl rounded-2xl bg-gray-200 font-bold mb-4 w-48 flex items-center justify-center"
						onClick={() => setShowQRCode(false)}
					>
						<MoveLeft className="pr-2" />
						Go Back
					</button>
					<QRCode
						value={prize.transaction_id}
						logoImage="/favicon.svg"
						logoWidth={300}
						logoHeight={300}
						size={1000}
						qrStyle="dots"
						style={{
							width: "4in",
							height: "4in",
							margin: "0 auto",
						}}
					/>
				</div>
			) : (
				<>
					<Check className="w-48 h-48 my-8" />
					<h2 className="text-4xl font-bold mb-4">Redeemed!</h2>
					<p className="text-2xl mb-4 p-10">
						You redeemed {prize.amount || 1} {prize.name}! You can see your
						prizes in your profile! Pick up your prize by visiting this prize
						again and showing an admin your transaction QR code!
					</p>
					<button
						type="button"
						className="self-center card-selected border-4 border-green-600 bg-green-400 text-white cursor-pointer w-80 h-20 inline-flex justify-center items-center mb-4 px-4 py-2 text-2xl font-extrabold rounded-2xl"
						onClick={() => setShowQRCode(true)}
					>
						Show QR Code
					</button>
					<button
						type="button"
						className="self-center card-selected border-4 border-default-selected bg-default text-white cursor-pointer w-80 h-20 inline-flex justify-center items-center mb-4 px-4 py-2 text-2xl font-extrabold rounded-2xl"
						onClick={closeDrawer}
					>
						Go Back
					</button>
				</>
			)}
		</div>
	);
}
