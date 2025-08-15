// Improve performance over importing svg for some reason
export default function ScottyCoin({ className }: { className?: string }) {
	return (
		<img
			className={className}
			src="/images/icons/scotty-coin.svg"
			alt="Scotty Coin"
		/>
	);
}
