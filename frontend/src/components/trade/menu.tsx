import { useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";
import RedeemedCheck from "@/assets/redeemed-check.svg?react";
import { QRScanner } from "@/components/challenges/steps/qr-scanner";
import Redeem from "@/components/trade/redeem";
import { Redeemed } from "@/components/trade/redeemed";
import { useApi } from "@/lib/app-context";
import { useQRScanner } from "@/lib/native/scanner";
import type { components } from "@/lib/schema.gen";

interface TradeMenuProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	prize: components["schemas"]["RewardResponse"];
	adminMode: boolean;
}

function handleQRScanFailed() {
	console.error("QR scan failed. Please try again.");
}
function handleQRScanCancelled() {
	console.error("QR scan cancelled.");
}

export function TradeMenu({
	isOpen,
	onOpenChange,
	prize,
	adminMode,
}: TradeMenuProps) {
	const { $api } = useApi();

	const { mutate: confirm, data: confirmData } = $api.useMutation(
		"post",
		"/api/admin/verify_transaction",
	);

	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [startScanQR, setScanQR] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const { scanQR } = useQRScanner<string>();

	function handleQRScanned(qrResult: string) {
		confirm({
			body: {
				transaction_id: qrResult,
			},
		});
	}

	const {
		data: { rewards: prizes } = { rewards: [] },
		refetch: refetchPrizes,
	} = $api.useQuery("get", "/api/rewards");

	const {
		data: {
			scotty_coins: { current: userCoins },
		} = { scotty_coins: { current: 0 } },
	} = $api.useQuery("get", "/api/profile");

	const {
		mutate: redeem,
		data: redeemData,
		reset: resetRedeem,
	} = $api.useMutation("post", "/api/transaction");
	const { transaction } = redeemData || {
		transaction: null,
	};
	// State for managing the selected size and quantity
	const [quantity, setQuantity] = useState<number>(1);

	// Check if user has enough coins
	const hasEnoughCoins = userCoins >= quantity * prize.cost;

	// Handle claim button click
	const handleClaim = () => {
		redeem({
			body: {
				count: quantity,
				reward_name: prize.name,
			},
		});
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: i want to push this code... sorry
	useEffect(() => {
		const performQRScan = async () => {
			try {
				if (startScanQR) {
					if (!videoRef.current || !canvasRef.current) {
						setError("Camera not ready. Please try again.");
						handleQRScanCancelled();
						return;
					}

					const qrResult = await scanQR(
						videoRef.current,
						canvasRef.current,
						async (qrData: string) => {
							return qrData;
						},
						15000, // 15 second timeout
					);

					if (!qrResult || typeof qrResult !== "string") {
						handleQRScanFailed();
					} else {
						handleQRScanned(qrResult);
					}
				}
			} catch (error) {
				console.error("Error scanning QR:", error);
				handleQRScanFailed();
			}
		};

		performQRScan();
	}, [scanQR, startScanQR]);

	return (
		<Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
			<Drawer.Portal>
				<Drawer.Overlay className="z-50 fixed inset-0 bg-black/40" />
				<Drawer.Content className="z-50 bg-white flex flex-col fixed bottom-0 left-0 right-0 h-[82vh] p-6 rounded-t-2xl">
					<Drawer.Handle />
					<Drawer.Title className="text-2xl self-center font-bold mt-4">
						{adminMode ? "Verify" : "Trade for"} {prize.name}
					</Drawer.Title>
					{adminMode ? (
						<div className="flex flex-col items-center p-4 text-lg mb-4">
							<button
								type="button"
								className={
									"self-center card-selected border-4 text-white cursor-pointer w-80 h-20 inline-flex justify-center items-center mb-4 px-4 py-2 text-2xl font-extrabold rounded-2xl disabled:opacity-50 " +
									(startScanQR
										? " border-red-700 bg-red-500 "
										: "border-green-600 bg-green-400")
								}
								onClick={() => setScanQR(!startScanQR)}
							>
								{startScanQR ? "Stop Scan" : "Start Scan"}
							</button>
							<QRScanner
								videoRef={videoRef}
								canvasRef={canvasRef}
								onCancel={handleQRScanCancelled}
							/>
							{error && (
								<div className="text-red-600 text-center mb-4">{error}</div>
							)}
							{confirmData?.success ? (
								<button
									type="button"
									disabled
									className="w-full py-2 text-lg font-bold rounded-2xl mb-4 bg-gray-200 text-gray-500 cursor-not-allowed flex items-center justify-center gap-2"
									onClick={() => {
										resetRedeem();
										refetchPrizes();
										onOpenChange(false);
									}}
								>
									<RedeemedCheck className="w-5 h-5" />
									Transaction verified
								</button>
							) : (
								<div className="text-red-500 text-sm">
									{confirmData?.message || "Awaiting Scan..."}
								</div>
							)}
						</div>
					) : transaction ? (
						<Redeemed
							closeDrawer={() => {
								resetRedeem();
								refetchPrizes();
								onOpenChange(false);
							}}
							prize={{
								name: prize.name,
								amount: quantity,
								transaction_id: transaction.transaction_id,
							}}
						/>
					) : (
						<Redeem
							prizes={prizes}
							prize={prize}
							quantity={quantity}
							setQuantity={setQuantity}
							handleClaim={handleClaim}
							hasEnoughCoins={hasEnoughCoins}
						/>
					)}
				</Drawer.Content>
			</Drawer.Portal>

			{/* Hidden video and canvas refs for QR scanning */}
			<video ref={videoRef} className="hidden" muted>
				<track kind="captions" />
			</video>
			<canvas ref={canvasRef} className="hidden" />
		</Drawer.Root>
	);
}
