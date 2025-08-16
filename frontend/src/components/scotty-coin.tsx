import ScottyCoinPng from "@/assets/scotty-coin.png";
// Improve performance over importing svg for some reason
export default function ScottyCoin({ className }: { className?: string }) {
	return <img src={ScottyCoinPng} className={className} alt="Scotty Coin" />;
}
