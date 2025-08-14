import { MoveLeft } from "lucide-react";
import { useState } from "react";
import { QRCode } from "react-qrcode-logo";
import QR from "@/assets/qr.svg?react";
import type { components } from "@/lib/schema.gen";

export default function TransactionsList({
	prizeName,
	prizes,
}: {
	prizeName: string;
	prizes: components["schemas"]["RewardResponse"][];
}) {
	const [selectedTransaction, setSelectedTransaction] = useState<string | null>(
		null,
	);

	return selectedTransaction ? (
		<div className="flex flex-col items-center justify-center p-4">
			<button
				type="button"
				className="w-full flex items-center justify-center"
				onClick={() => setSelectedTransaction(null)}
			>
				<button
					type="button"
					className="text-2xl rounded-2xl bg-gray-200 font-bold mb-4 w-48 flex items-center justify-center"
				>
					<MoveLeft className="pr-2" />
					Go Back
				</button>
			</button>
			<QRCode
				value={selectedTransaction}
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
		<div className="w-full h-96 overflow-y-auto">
			{prizes
				.find((prize) => prize.name === prizeName)
				?.transaction_info.transactions.map((transaction) => (
					<div
						key={transaction.transaction_id}
						className="w-full max-w-2xl mx-auto relative rounded-[20px] h-24 mb-4"
					>
						<div className="w-full pl-6 pr-6 py-6 left-0 top-0 absolute bg-white rounded-[20px] inline-flex justify-between items-center shadow-[0_3px_0_#bbb] h-full">
							<div className="flex justify-start items-start gap-6 flex-1">
								<div className="flex-1 inline-flex flex-col justify-start items-start gap-2">
									<div className="self-stretch inline-flex justify-between items-start">
										<div className="flex-1 flex justify-center items-center gap-2.5 flex-wrap content-center">
											<div className="flex-1 justify-start text-black text-base font-bold font-['Open_Sans'] tracking-tight">
												{new Date(transaction.timestamp).toLocaleString(
													"en-US",
													{
														timeZone: "+16:00",
													},
												)}
												<div className="justify-start">
													<span className="text-gray-500 text-xs font-bold font-['Open_Sans'] leading-none tracking-tight">
														Claimed: {transaction.count || 0}
													</span>
												</div>
											</div>
										</div>
										<button
											type="button"
											className="self-center card-selected border-4 border-green-600 bg-green-400 text-white cursor-pointer w-20 h-20 inline-flex justify-center items-center text-2xl font-extrabold rounded-2xl"
											onClick={() => {
												setSelectedTransaction(transaction.transaction_id);
											}}
										>
											<QR className="w-20 h-20" />
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				))}
		</div>
	);
}
